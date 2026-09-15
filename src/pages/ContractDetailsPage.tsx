import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRightIcon, ChevronDownIcon, CheckCircle2Icon, XCircleIcon, AlertCircleIcon, InfoIcon, EyeIcon, RefreshCwIcon, DownloadIcon, RotateCcwIcon, SaveIcon, FileTextIcon, BriefcaseIcon, Building2Icon, UploadCloudIcon, PhoneCallIcon, ClipboardListIcon, LinkIcon, PlusIcon, Trash2Icon, ShieldCheckIcon, CheckCheckIcon, ClockIcon, UserIcon, HistoryIcon, SendIcon } from 'lucide-react';
import { getContractDetails, getContractPipelineStatus, constructS3DocumentUrl, getPGsByContract, listPoliciesForContract, getPGsByPolicy, updatePG, UpdatePGPayload, PerformanceGuarantee, PolicySummary, PGValidation, ContractValidation, ExtractionException, getContractHierarchy, ContractHierarchyResponse, createPolicy, CreatePolicyPayload, deletePolicy, validatePG, createPG, ManualPGPayload, PGValidationResult, submitReviewDecision, getPGDetail, listReviewQueue, getReviewItem, ReviewItemDetail, ReviewAction, PGHistoryItem } from '../services/api';
import { Drawer } from '../components/ui/Drawer';
import { ContractDetails } from '../services/api';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Loader } from '../components/ui/Loader';
import { Dialog } from '../components/ui/Dialog';
import { Toast, ToastType } from '../components/ui/Toast';
import { mapStatusToFileStatus } from '../services/mappers';
import { getFeatureFlag, FeatureFlagKeys } from '../config/launchdarkly';

type MainTabKey = 'contract' | 'pgs' | 'operational';

type PGTabKey = 'all' | 'standard' | 'nonStandard' | 'custom';

const pgTabs: {key: PGTabKey; label: string}[] = [
  { key: 'all', label: 'All' },
  { key: 'standard', label: 'Standard' },
  { key: 'nonStandard', label: 'Non-Standard' },
  { key: 'custom', label: 'Custom' }
];

async function loadPolicyList(
  contractId: string,
  fallbackPolicies: string[] = []
): Promise<{ summaries: PolicySummary[]; hasHierarchy: boolean }> {
  try {
    const summaries = await listPoliciesForContract(contractId);
    if (summaries.length > 0) return { summaries, hasHierarchy: true };
  } catch (err) {
    console.warn('Policy hierarchy endpoint unavailable, falling back to contract-level PG list', err);
  }
  const summaries: PolicySummary[] = (fallbackPolicies.length > 0 ? fallbackPolicies : ['(No Policy Number)']).map((pn) => ({
    policy_number: pn,
    total_pgs: 0,
    pending_review: 0,
    approved: 0,
  }));
  return { summaries, hasHierarchy: false };
}

export function ContractDetailsPage() {
  const { fileId = '' } = useParams();
  const navigate = useNavigate();
  
  const [contract, setContract] = useState<ContractDetails | null>(null);
  const [pgs, setPgs] = useState<PerformanceGuarantee[]>([]);
  const [pgsByPolicy, setPgsByPolicy] = useState<Record<string, PerformanceGuarantee[]>>({});
  const [pgsByPolicyLoading, setPgsByPolicyLoading] = useState<Record<string, boolean>>({});
  const [policySummaries, setPolicySummaries] = useState<PolicySummary[]>([]);
  const [usesPolicyHierarchy, setUsesPolicyHierarchy] = useState(false);
  const [hierarchyData, setHierarchyData] = useState<ContractHierarchyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<string>('');
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [mainTab, setMainTab] = useState<MainTabKey>('contract');
  const [pgTab, setPgTab] = useState<PGTabKey>('all');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [showAddPG, setShowAddPG] = useState(false);
  const [deletingPolicy, setDeletingPolicy] = useState<string | null>(null);
  const [reviewDrawerPg, setReviewDrawerPg] = useState<PerformanceGuarantee | null>(null);
  const showPerformanceGuarantees = getFeatureFlag(FeatureFlagKeys.PERFORMANCE_GUARANTEE);
  const showReviewProgress = getFeatureFlag(FeatureFlagKeys.REVIEW_PROGRESS);
  const showExtractionExceptions = getFeatureFlag(FeatureFlagKeys.EXTRACTION_EXCEPTIONS);
  const showPgValidations = getFeatureFlag(FeatureFlagKeys.PG_VALIDATIONS);
  const showOperationalData = getFeatureFlag(FeatureFlagKeys.OPERATIONAL_DATA);

  useEffect(() => {
    loadContractData();
  }, [fileId]);

  const loadContractData = async () => {
    try {
      setLoading(true);
      setError(null);
      const contractData = await getContractDetails(fileId);
      setContract(contractData);
      setDocumentUrl(contractData.document_url || constructS3DocumentUrl(contractData.s3_bucket, contractData.s3_key));

      try {
        const status = await getContractPipelineStatus(fileId);
        setPipelineStatus(status.pipelineStatus);
      } catch (err) {
        console.error('Failed to get pipeline status:', err);
      }

      if (showPerformanceGuarantees) {
        try {
          const hierarchy = await getContractHierarchy(fileId);
          setHierarchyData(hierarchy);
          
          const { summaries, hasHierarchy } = await loadPolicyList(fileId, contractData.policy_numbers);
          setPolicySummaries(summaries);
          setUsesPolicyHierarchy(hasHierarchy);
          if (!hasHierarchy) {
            const flat = await getPGsByContract(fileId);
            setPgs(flat);
            const byPolicy: Record<string, PerformanceGuarantee[]> = {};
            for (const p of summaries) byPolicy[p.policy_number] = flat;
            setPgsByPolicy(byPolicy);
          } else {
            setPgs([]);
            setPgsByPolicy({});
          }
        } catch (err) {
          console.error('Failed to load PGs:', err);
          setPgs([]);
          setPgsByPolicy({});
          setPolicySummaries([]);
        }
      }
    } catch (err) {
      console.error('Failed to load contract:', err);
      setError(err instanceof Error ? err.message : 'Failed to load contract');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const contractData = await getContractDetails(fileId);
      setContract(contractData);
      setDocumentUrl(contractData.document_url || constructS3DocumentUrl(contractData.s3_bucket, contractData.s3_key));

      try {
        const status = await getContractPipelineStatus(fileId);
        setPipelineStatus(status.pipelineStatus);
      } catch (err) {
        console.error('Failed to refresh pipeline status:', err);
      }

      if (showPerformanceGuarantees) {
        try {
          const hierarchy = await getContractHierarchy(fileId);
          setHierarchyData(hierarchy);
          
          const { summaries, hasHierarchy } = await loadPolicyList(fileId, contractData.policy_numbers);
          setPolicySummaries(summaries);
          setUsesPolicyHierarchy(hasHierarchy);
          if (!hasHierarchy) {
            const flat = await getPGsByContract(fileId);
            setPgs(flat);
            const byPolicy: Record<string, PerformanceGuarantee[]> = {};
            for (const p of summaries) byPolicy[p.policy_number] = flat;
            setPgsByPolicy(byPolicy);
          } else {
            const alreadyLoaded = Object.keys(pgsByPolicy);
            if (alreadyLoaded.length > 0) {
              const refreshed: Record<string, PerformanceGuarantee[]> = {};
              await Promise.all(
                alreadyLoaded.map(async (pn) => {
                  try {
                    refreshed[pn] = await getPGsByPolicy(fileId, pn);
                  } catch (err) {
                    console.error(`Failed to refresh PGs for policy ${pn}:`, err);
                    refreshed[pn] = pgsByPolicy[pn] ?? [];
                  }
                })
              );
              setPgsByPolicy(refreshed);
              const seen = new Set<string>();
              const flat: PerformanceGuarantee[] = [];
              for (const list of Object.values(refreshed)) {
                for (const pg of list) {
                  if (!seen.has(pg.pg_record_id)) { seen.add(pg.pg_record_id); flat.push(pg); }
                }
              }
              setPgs(flat);
            }
          }
        } catch (err) {
          console.error('Failed to refresh PGs:', err);
        }
      }
    } catch (err) {
      console.error('Failed to refresh contract:', err);
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const ensurePolicyPGsLoaded = async (policyNumber: string) => {
    if (!usesPolicyHierarchy) return;
    if (pgsByPolicy[policyNumber] !== undefined) return;
    if (pgsByPolicyLoading[policyNumber]) return;
    setPgsByPolicyLoading((prev) => ({ ...prev, [policyNumber]: true }));
    try {
      const list = await getPGsByPolicy(fileId, policyNumber);
      setPgsByPolicy((prev) => ({ ...prev, [policyNumber]: list }));
      setPgs((prev) => {
        const seen = new Set(prev.map((p) => p.pg_record_id));
        const merged = [...prev];
        for (const pg of list) {
          if (!seen.has(pg.pg_record_id)) merged.push(pg);
        }
        return merged;
      });
    } catch (err) {
      console.error(`Failed to load PGs for policy ${policyNumber}:`, err);
      setPgsByPolicy((prev) => ({ ...prev, [policyNumber]: [] }));
    } finally {
      setPgsByPolicyLoading((prev) => ({ ...prev, [policyNumber]: false }));
    }
  };

  const handleTogglePolicy = (policyNumber: string) => {
    const key = `policy:${policyNumber}`;
    const willOpen = !(openSections[key] ?? false);
    toggleSection(key);
    if (willOpen) {
      void ensurePolicyPGsLoaded(policyNumber);
    }
  };

  const handleSavePG = async (pg: PerformanceGuarantee, payload: UpdatePGPayload): Promise<PerformanceGuarantee | null> => {
    try {
      const updated = await updatePG(fileId, pg.pg_id, payload);
      const merged: PerformanceGuarantee = { ...pg, ...updated };
      setPgs((prev) => prev.map((p) => (p.pg_record_id === pg.pg_record_id ? merged : p)));
      setPgsByPolicy((prev) => {
        const next: Record<string, PerformanceGuarantee[]> = {};
        for (const [policy, list] of Object.entries(prev)) {
          next[policy] = list.map((p) => (p.pg_record_id === pg.pg_record_id ? merged : p));
        }
        return next;
      });
      const wasApproved = pg.review_status === 'APPROVED' || pg.review_status === 'APPROVED_WITH_EDITS';
      setToast({
        message: wasApproved
          ? `${pg.pg_sub_category || pg.pg_id} updated · re-review triggered`
          : `${pg.pg_sub_category || pg.pg_id} updated successfully`,
        type: 'success',
      });
      return merged;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update PG';
      setToast({ message, type: 'error' });
      return null;
    }
  };

  const applyPgUpdate = (pgRecordId: string, updated: PerformanceGuarantee) => {
    setPgs((prev) => prev.map((p) => (p.pg_record_id === pgRecordId ? updated : p)));
    setPgsByPolicy((prev) => {
      const next: Record<string, PerformanceGuarantee[]> = {};
      for (const [policy, list] of Object.entries(prev)) {
        next[policy] = list.map((p) => (p.pg_record_id === pgRecordId ? updated : p));
      }
      return next;
    });
  };

  // Some PG list endpoints omit review_id even when a review exists; resolve it on demand.
  const resolveReviewId = async (pg: PerformanceGuarantee): Promise<string | null> => {
    if (pg.review_id) return pg.review_id;
    try {
      const result = await listReviewQueue({ contractId: fileId, limit: 200 });
      const match = result.items.find((item) => item.pg_record_id === pg.pg_record_id);
      return match?.review_id ?? null;
    } catch (err) {
      console.error('Failed to resolve review id for PG:', err);
      return null;
    }
  };

  const handleApprovePG = async (
    pg: PerformanceGuarantee,
    payload: Partial<UpdatePGPayload>,
    comments: string,
    isDirty: boolean,
  ): Promise<PerformanceGuarantee | null> => {
    const reviewId = await resolveReviewId(pg);
    if (!reviewId) {
      setToast({ message: 'No pending review found for this PG', type: 'error' });
      return null;
    }
    try {
      const editedFields = isDirty
        ? {
            ...payload,
            edit_reason: comments || 'Corrected before approving',
          }
        : undefined;
      await submitReviewDecision(reviewId, {
        action: 'APPROVE',
        comments: comments || 'Reviewed - AI extraction is accurate',
        editedFields,
      });
      const refreshed = await getPGDetail(fileId, pg.pg_id);
      applyPgUpdate(pg.pg_record_id, refreshed);
      setToast({
        message: `${pg.pg_sub_category || pg.pg_id} approved successfully`,
        type: 'success',
      });
      return refreshed;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve PG';
      setToast({ message, type: 'error' });
      return null;
    }
  };

  const handleReviewDecision = async (
    pg: PerformanceGuarantee,
    action: ReviewAction,
    comments: string,
  ): Promise<PerformanceGuarantee | null> => {
    const reviewId = await resolveReviewId(pg);
    if (!reviewId) {
      setToast({ message: 'No pending review found for this PG', type: 'error' });
      return null;
    }
    try {
      await submitReviewDecision(reviewId, { action, comments });
      const refreshed = await getPGDetail(fileId, pg.pg_id);
      applyPgUpdate(pg.pg_record_id, refreshed);
      const verb = action === 'APPROVE' ? 'approved' : action === 'REJECT' ? 'rejected' : 'sent back for changes';
      setToast({ message: `${pg.pg_sub_category || pg.pg_id} ${verb}`, type: 'success' });
      return refreshed;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit review decision';
      setToast({ message, type: 'error' });
      return null;
    }
  };

  // Reload contract-level counters and policy summaries after a policy or PG mutation.
  // Expands the broker/client/policy tree (hierarchy view) and the flat-view key
  // for a given policy number, so a newly created policy/PG is visible without
  // the user having to manually drill down.
  const revealPolicyInSections = (hierarchy: ContractHierarchyResponse, policyNumber: string) => {
    setOpenSections((prev) => {
      const next = { ...prev, [`policy:${policyNumber}`]: true };
      hierarchy.items.forEach((brokerItem, brokerIdx) => {
        const brokerKey = `broker:${brokerIdx}`;
        brokerItem.clients.forEach((client, clientIdx) => {
          const clientKey = `${brokerKey}:client:${clientIdx}`;
          const hasPolicy = client.contracts.some((c) => c.policy_numbers?.includes(policyNumber));
          if (hasPolicy) {
            next[brokerKey] = true;
            next[clientKey] = true;
            next[`${clientKey}:policy:${policyNumber}`] = true;
          }
        });
      });
      return next;
    });
  };

  const refreshRelatedData = async (revealPolicyNumber?: string, policyNumberToReloadPGs?: string) => {
    let contractData: ContractDetails | null = null;
    try {
      contractData = await getContractDetails(fileId);
      setContract(contractData);
    } catch (err) {
      console.error('Failed to refresh contract after mutation:', err);
    }
    try {
      const hierarchy = await getContractHierarchy(fileId);
      setHierarchyData(hierarchy);
      if (revealPolicyNumber) revealPolicyInSections(hierarchy, revealPolicyNumber);
    } catch (err) {
      console.error('Failed to refresh hierarchy after mutation:', err);
    }
    try {
      const { summaries, hasHierarchy } = await loadPolicyList(fileId, contractData?.policy_numbers ?? []);
      setPolicySummaries(summaries);
      setUsesPolicyHierarchy(hasHierarchy);
    } catch (err) {
      console.error('Failed to refresh policy summaries after mutation:', err);
    }
    if (policyNumberToReloadPGs) {
      try {
        const list = await getPGsByPolicy(fileId, policyNumberToReloadPGs);
        setPgsByPolicy((prev) => ({ ...prev, [policyNumberToReloadPGs]: list }));
        setPgs((prev) => {
          const seen = new Set<string>();
          const merged: PerformanceGuarantee[] = [];
          for (const p of prev) {
            if (p.pg_record_id !== undefined && !seen.has(p.pg_record_id) ) {
              if (list.some((l) => l.pg_record_id === p.pg_record_id)) continue;
              seen.add(p.pg_record_id);
              merged.push(p);
            }
          }
          for (const l of list) merged.push(l);
          return merged;
        });
      } catch (err) {
        console.error(`Failed to reload PGs for policy ${policyNumberToReloadPGs}:`, err);
      }
    }
  };

  const handlePolicyCreated = async (policyNumber: string) => {
    setShowAddPolicy(false);
    setToast({ message: `Policy ${policyNumber} created successfully`, type: 'success' });
    await refreshRelatedData(policyNumber);
  };

  const handlePGCreated = async (policyNumber: string, pgId: string) => {
    setShowAddPG(false);
    setToast({ message: `${pgId} created successfully`, type: 'success' });
    await refreshRelatedData(policyNumber, policyNumber);
  };

  const handleDeletePolicy = async (policyNumber: string) => {
    if (!window.confirm(`Delete policy ${policyNumber}? This cannot be undone.`)) return;
    setDeletingPolicy(policyNumber);
    try {
      await deletePolicy(fileId, policyNumber);
      setToast({ message: `Policy ${policyNumber} deleted`, type: 'success' });
      setPolicySummaries((prev) => prev.filter((p) => p.policy_number !== policyNumber));
      setPgsByPolicy((prev) => {
        const next = { ...prev };
        delete next[policyNumber];
        return next;
      });
      await refreshRelatedData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete policy';
      setToast({ message, type: 'error' });
    } finally {
      setDeletingPolicy(null);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (error || !contract) {
    return (
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-4">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">{error || 'Contract not found'}</p>
          <button
            onClick={() => navigate('/pg-management')}
            className="mt-2 text-sm font-semibold text-red-900 underline"
          >
            Back to PG Management
          </button>
        </div>
      </div>
    );
  }

  const status = mapStatusToFileStatus(contract.overall_status);
  const policiesText = contract.policy_numbers?.length > 0 
    ? contract.policy_numbers.join(' · ')
    : 'No policies';
  
  const dateRange = contract.agreement_period_start && contract.agreement_period_end
    ? `${new Date(contract.agreement_period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(contract.agreement_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'Date range not available';

  let atRiskText = '—';
  if (contract.premium_percentage || contract.admin_fee_percentage) {
    const parts = [];
    if (contract.premium_percentage) {
      parts.push(`${contract.premium_percentage}% Premium`);
    }
    if (contract.admin_fee_percentage) {
      parts.push(`${contract.admin_fee_percentage}% Admin Fee`);
    }
    atRiskText = parts.join(' + ');
  }

  const capText = contract.dollar_cap 
    ? `$${parseFloat(contract.dollar_cap).toLocaleString()}`
    : '—';

  const signatureText = contract.signature_status === 'SIGNED' 
    ? 'Signed' 
    : contract.signature_status === 'UNSIGNED' 
    ? 'Unsigned' 
    : contract.signature_status || 'Unknown';

  const totalPgs = pgs.length;
  const reviewedPgs = pgs.filter(pg => pg.review_status === 'REVIEWED' || pg.review_status === 'APPROVED').length;
  const reviewProgress = totalPgs > 0 ? Math.round((reviewedPgs / totalPgs) * 100) : 0;

  const isStandard = (c: string) => c === 'STANDARD';
  const isNonStandard = (c: string) => c === 'NON_STANDARD' || c === 'NON-STD' || c === 'NONSTANDARD';
  const isCustom = (c: string) => c === 'CUSTOM' || c === 'CUSTOM_NEW';

  // Under the policy-hierarchy view, `pgs` only fills in as each policy is expanded/lazy-loaded,
  // so it under-reports (shows 0) right after load. Fall back to the contract-level totals
  // (already available from the initial contract fetch) until any PG has actually been loaded.
  const pgCounts = pgs.length > 0 || !usesPolicyHierarchy
    ? {
        all: totalPgs,
        standard: pgs.filter(pg => isStandard(pg.classification)).length,
        nonStandard: pgs.filter(pg => isNonStandard(pg.classification)).length,
        custom: pgs.filter(pg => isCustom(pg.classification)).length,
      }
    : {
        all: contract.total_pgs ?? 0,
        standard: contract.standard_count ?? 0,
        nonStandard: contract.non_standard_count ?? 0,
        custom: contract.custom_new_count ?? 0,
      };

  const policyList = policySummaries.length > 0
    ? policySummaries.map((p) => p.policy_number)
    : (contract.policy_numbers && contract.policy_numbers.length > 0
      ? contract.policy_numbers
      : ['(No Policy Number)']);

  // Broker -> Client hierarchy for this contract, so Add Policy/Add PG offer real choices instead of a single locked value.
  // Always seed with the contract's own broker/client first, since the hierarchy API can be missing, empty,
  // or use slightly different casing/whitespace — without this the Client dropdown can render blank.
  const brokerClientOptions: { broker: string; clients: string[] }[] = (() => {
    const map = new Map<string, Set<string>>();
    const addPair = (broker?: string | null, client?: string | null) => {
      const b = (broker || '').trim();
      if (!b) return;
      if (!map.has(b)) map.set(b, new Set());
      const c = (client || '').trim();
      if (c) map.get(b)!.add(c);
    };

    addPair(contract.broker_producer, contract.client_name);

    if (hierarchyData && hierarchyData.items.length > 0) {
      for (const item of hierarchyData.items) {
        if (item.clients.length === 0) {
          addPair(item.broker, null);
        }
        for (const c of item.clients) {
          addPair(item.broker, c.client_name);
        }
      }
    }

    if (map.size === 0) map.set('Unknown', new Set(['Unknown']));

    return Array.from(map.entries()).map(([broker, clients]) => ({
      broker,
      clients: clients.size > 0 ? Array.from(clients) : ['Unknown'],
    }));
  })();

  const policySections = policyList.map((policyNumber) => {
    const policyPgs = pgsByPolicy[policyNumber] ?? [];
    const scopedFiltered = policyPgs.filter((pg) => {
      if (pgTab === 'all') return true;
      if (pgTab === 'standard') return isStandard(pg.classification);
      if (pgTab === 'nonStandard') return isNonStandard(pg.classification);
      if (pgTab === 'custom') return isCustom(pg.classification);
      return false;
    });
    const products = scopedFiltered.reduce<Record<string, PerformanceGuarantee[]>>((acc, pg) => {
      const lines = Array.isArray(pg.product_line) && pg.product_line.length > 0
        ? pg.product_line
        : ['Unassigned'];
      lines.forEach((line) => {
        const key = line || 'Unassigned';
        if (!acc[key]) acc[key] = [];
        acc[key].push(pg);
      });
      return acc;
    }, {});
    const summary = policySummaries.find((p) => p.policy_number === policyNumber);
    return {
      key: policyNumber,
      label: policyNumber,
      pgs: scopedFiltered,
      products,
      summary,
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-4">
      <nav className="flex items-center gap-1 text-sm text-gray-600">
        <button
          onClick={() => navigate('/pg-management')}
          className="hover:text-navy-700 transition-colors"
        >
          PG Management
        </button>
        <ChevronRightIcon className="h-4 w-4" />
        <span className="text-navy-700 font-medium">{contract.client_name}</span>
      </nav>

      <div className="rounded-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-start justify-between mb-2 gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-navy-800 break-words">{contract.client_name}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {policiesText} | {dateRange}
            </p>
            {pipelineStatus && (
              <p className="mt-1 text-[12px] text-gray-500">
                Current Process: <span className="font-semibold text-navy-700">{pipelineStatus}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={status} />
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              disabled={!documentUrl}
              title={documentUrl ? 'Preview document' : 'Document preview not available'}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                documentUrl
                  ? 'bg-navy-700 text-white hover:bg-navy-800'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <EyeIcon className="h-4 w-4" />
              View Contract
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              aria-label="Refresh contract data"
              title="Refresh"
              className="rounded p-1.5 text-navy-700 transition-colors hover:bg-navy-100"
            >
              <RefreshCwIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-b border-gray-200">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMainTab('contract')}
            className={`px-4 py-2 text-[13px] font-semibold transition-colors border-b-2 -mb-px ${
              mainTab === 'contract'
                ? 'text-navy-700 border-navy-700'
                : 'text-gray-500 border-transparent hover:text-navy-700'
            }`}
          >
            Contract Information
          </button>
          {showPerformanceGuarantees && (
            <button
              type="button"
              onClick={() => setMainTab('pgs')}
              className={`px-4 py-2 text-[13px] font-semibold transition-colors border-b-2 -mb-px ${
                mainTab === 'pgs'
                  ? 'text-navy-700 border-navy-700'
                  : 'text-gray-500 border-transparent hover:text-navy-700'
              }`}
            >
              PGs {pgs.length > 0 && <span className="ml-1 text-gray-400">({pgs.length})</span>}
            </button>
          )}
          {showOperationalData && (
            <button
              type="button"
              onClick={() => setMainTab('operational')}
              className={`px-4 py-2 text-[13px] font-semibold transition-colors border-b-2 -mb-px ${
                mainTab === 'operational'
                  ? 'text-navy-700 border-navy-700'
                  : 'text-gray-500 border-transparent hover:text-navy-700'
              }`}
            >
              Operational Data
              <span className="ml-1.5 inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 uppercase tracking-wide align-middle">Preview</span>
            </button>
          )}
        </div>
        {showPerformanceGuarantees && (
          <div className="flex items-center gap-2 pb-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowAddPolicy(true)}
              className="inline-flex items-center gap-1.5 rounded bg-navy-700 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-800"
            >
              <PlusIcon className="h-4 w-4" />
              Add Policy
            </button>
            <button
              type="button"
              onClick={() => setShowAddPG(true)}
              disabled={policyList.length === 0}
              className="inline-flex items-center gap-1.5 rounded bg-navy-700 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon className="h-4 w-4" />
              Add PG
            </button>
          </div>
        )}
      </div>

      {mainTab === 'contract' && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">At Risk</div>
              <div className="text-base font-semibold text-navy-800">{atRiskText}</div>
            </div>
            <div className="rounded-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cap</div>
              <div className="text-base font-semibold text-navy-800">{capText}</div>
            </div>
            <div className="rounded-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Signature</div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-semibold text-navy-800">{signatureText}</span>
                {contract.signature_status === 'SIGNED' && (
                  <CheckCircle2Icon className="h-4 w-4 text-green-600" />
                )}
                {contract.signature_status === 'UNSIGNED' && (
                  <XCircleIcon className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-gray-200 bg-white shadow-sm">
            <div className="flex h-9 items-center bg-navy-700 px-3 text-white">
              <h2 className="text-[13px] font-semibold">Extracted Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {(() => {
                const fields: { label: string; value: string | null | undefined }[] = [
                  { label: 'Client Name', value: contract.client_name },
                  { label: 'Salesforce Client Name', value: contract.salesforce_client_name },
                  { label: 'Client Account #', value: contract.client_account_number },
                  { label: 'Contract Date', value: contract.contract_date },
                  { label: 'Agreement Type', value: contract.agreement_period_type },
                  { label: 'Agreement Start', value: contract.agreement_period_start },
                  { label: 'Agreement End', value: contract.agreement_period_end },
                  { label: 'Renewal Date', value: contract.renewal_date },
                  { label: 'Cancellation Date', value: contract.cancellation_date },
                  { label: 'NYL Representative', value: contract.nyl_representative_name },
                  { label: 'Broker / Producer', value: contract.broker_producer },
                  { label: 'Account Manager', value: contract.account_manager },
                  { label: 'Total Amount at Risk', value: contract.total_amount_at_risk_desc },
                  { label: 'Amount at Risk Type', value: contract.total_amount_at_risk_type },
                  { label: 'Premium Percentage', value: contract.premium_percentage ? `${contract.premium_percentage}%` : null },
                  { label: 'Admin Fee Percentage', value: contract.admin_fee_percentage ? `${contract.admin_fee_percentage}%` : null },
                  { label: 'Dollar Cap', value: contract.dollar_cap ? `$${parseFloat(contract.dollar_cap).toLocaleString()}` : null },
                  { label: 'Implementation Amount at Risk', value: contract.implementation_amount_at_risk ? `$${parseFloat(contract.implementation_amount_at_risk).toLocaleString()}` : null },
                  { label: 'Penalty Basis', value: contract.penalty_basis },
                  { label: 'Signature Status', value: contract.signature_status },
                  { label: 'Signature Date', value: contract.signature_date },
                  { label: 'Off-Cycle', value: contract.off_cycle_flag ? 'Yes' : 'No' },
                  { label: 'WTW Indicator', value: contract.wtw_indicator ? 'Yes' : 'No' },
                  { label: 'AON Indicator', value: contract.aon_indicator ? 'Yes' : 'No' },
                  { label: 'Total Pages', value: contract.contract_pages_total?.toString() },
                  { label: 'Total PGs', value: contract.total_pgs?.toString() },
                  { label: 'Standard Count', value: contract.standard_count?.toString() },
                  { label: 'Non-Standard Count', value: contract.non_standard_count?.toString() },
                  { label: 'Human Review Count', value: contract.human_review_count?.toString() },
                  { label: 'Validation Failures', value: contract.contract_validation_failures?.toString() },
                  { label: 'Validation Warnings', value: contract.contract_validation_warnings?.toString() },
                  { label: 'Policy Numbers', value: contract.policy_numbers?.join(', ') },
                  { label: 'Uploaded By', value: contract.uploaded_by },
                  { label: 'Last Reviewed By', value: contract.last_reviewed_by },
                ];
                const hasValue = (v: string | null | undefined) => v !== null && v !== undefined && v !== '';
                const filled = fields.filter((f) => hasValue(f.value));
                const empty = fields.filter((f) => !hasValue(f.value));
                return [...filled, ...empty].map((f) => (
                  <InfoField key={f.label} label={f.label} value={f.value} />
                ));
              })()}
            </div>
          </div>

          {contract.contract_validations && contract.contract_validations.length > 0 && (
            <ContractValidationsPanel validations={contract.contract_validations} />
          )}

          {showExtractionExceptions && contract.extraction_exceptions && contract.extraction_exceptions.length > 0 && (
            <div className="rounded-md border border-gray-200 bg-white shadow-sm">
              <div className="flex h-9 items-center bg-navy-700 px-3 text-white">
                <h2 className="text-[13px] font-semibold">Extraction Exceptions ({contract.extraction_exceptions.length})</h2>
              </div>
              <div className="flex flex-col gap-2 p-4">
                {contract.extraction_exceptions.map((ex, i) => (
                  <ExceptionCard key={`${ex.exception_type}-${i}`} exception={ex} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {mainTab === 'pgs' && showPerformanceGuarantees && (
        <>
          {showReviewProgress && totalPgs > 0 && (
            <div className="rounded-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-navy-800">Review Progress</div>
                <div className="text-sm font-semibold text-navy-700">
                  {reviewedPgs} of {totalPgs} reviewed ({reviewProgress}%)
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-navy-700 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${reviewProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 py-1">
            {pgTabs.map((tab) => {
              const active = pgTab === tab.key;
              const count = pgCounts[tab.key];

              let colorClasses = '';
              if (tab.key === 'all') {
                colorClasses = active
                  ? 'bg-navy-700 text-white border-navy-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50';
              } else if (tab.key === 'standard') {
                colorClasses = active
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-green-700 border-green-300 hover:bg-green-50';
              } else if (tab.key === 'nonStandard') {
                colorClasses = active
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50';
              } else {
                colorClasses = active
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-red-700 border-red-300 hover:bg-red-50';
              }

              return (
                <button
                  key={tab.key}
                  onClick={() => setPgTab(tab.key)}
                  className={`rounded border px-3 py-1.5 text-[12.5px] font-medium transition-all duration-150 ${colorClasses}`}
                >
                  {tab.label} <span className="font-semibold">({count})</span>
                </button>
              );
            })}
          </div>

          {policySections.length === 0 && !hierarchyData ? (
            <div className="rounded-md border border-gray-200 bg-white px-4 py-10 text-center text-[13px] text-gray-500 shadow-sm">
              No policies found for this contract
            </div>
          ) : hierarchyData && hierarchyData.items.length > 0 ? (
            <div className="flex flex-col gap-4">
              {hierarchyData.items.map((brokerItem, brokerIdx) => {
                const brokerKey = `broker:${brokerIdx}`;
                const isBrokerOpen = openSections[brokerKey] ?? true;
                
                return (
                  <div key={brokerKey} className="rounded-lg border-2 border-navy-300 bg-white shadow-md overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSection(brokerKey)}
                      className="w-full flex items-center gap-3 bg-gradient-to-r from-navy-700 to-navy-600 px-5 py-3 text-left text-white transition-colors hover:from-navy-800 hover:to-navy-700"
                    >
                      <ChevronDownIcon className={`h-5 w-5 shrink-0 transition-transform ${isBrokerOpen ? '' : '-rotate-90'}`} />
                      <BriefcaseIcon className="h-5 w-5 shrink-0" />
                      <div className="flex flex-col leading-tight min-w-0">
                        <span className="text-[11px] uppercase tracking-wider text-white/70 font-semibold">Broker</span>
                        <span className="text-[15px] font-bold truncate">{brokerItem.broker}</span>
                      </div>
                    </button>
                    
                    {isBrokerOpen && brokerItem.clients.map((client, clientIdx) => {
                      const clientKey = `${brokerKey}:client:${clientIdx}`;
                      const isClientOpen = openSections[clientKey] ?? true;
                      
                      return (
                        <div key={clientKey} className="border-t border-navy-200">
                          <button
                            type="button"
                            onClick={() => toggleSection(clientKey)}
                            className="w-full flex items-center gap-3 bg-navy-50 px-5 py-3 text-left transition-colors hover:bg-navy-100"
                          >
                            <ChevronDownIcon className={`h-4 w-4 shrink-0 text-navy-700 transition-transform ${isClientOpen ? '' : '-rotate-90'}`} />
                            <Building2Icon className="h-4 w-4 shrink-0 text-navy-600" />
                            <div className="flex flex-col leading-tight min-w-0">
                              <span className="text-[10px] uppercase tracking-wide text-navy-500 font-semibold">Client</span>
                              <span className="text-[14px] font-bold text-navy-800 truncate">{client.client_name}</span>
                            </div>
                          </button>
                          
                          {isClientOpen && client.contracts.map((contractItem, contractIdx) => {
                            // The hierarchy API's policy_numbers only reflects the contract's originally
                            // extracted policies and doesn't include policies added later via Add Policy.
                            // Prefer the dedicated Policies API list (policyList/policySummaries), which
                            // is refreshed after every Add/Delete Policy call, so counts stay accurate.
                            const policyNumbers = policyList.length > 0 ? policyList : (contractItem.policy_numbers || []);
                            
                            return (
                              <div key={contractIdx} className="bg-gray-50/60 px-5 py-4 border-t border-gray-200">
                                <div className="mb-3 flex items-center gap-2 text-[12px] text-gray-600">
                                  <ClipboardListIcon className="h-4 w-4" />
                                  <span className="font-semibold">Policies ({policyNumbers.length})</span>
                                  <span className="ml-auto text-[11px]">
                                    <span className="text-green-700 font-semibold">{contractItem.standard_count} Standard</span>
                                    {' • '}
                                    <span className="text-amber-700 font-semibold">{contractItem.non_standard_count} Non-Standard</span>
                                    {' • '}
                                    <span className="text-gray-600 font-semibold">{contractItem.total_pgs} Total PGs</span>
                                  </span>
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                  {policyNumbers.map((policyNumber) => {
                                    const policyKey = `${clientKey}:policy:${policyNumber}`;
                                    const isPolicyOpen = openSections[policyKey] ?? false;
                                    const isLoaded = pgsByPolicy[policyNumber] !== undefined;
                                    const isLoading = pgsByPolicyLoading[policyNumber] === true;
                                    
                                    const policyPgs = pgsByPolicy[policyNumber] ?? [];
                                    const scopedFiltered = policyPgs.filter((pg) => {
                                      if (pgTab === 'all') return true;
                                      if (pgTab === 'standard') return isStandard(pg.classification);
                                      if (pgTab === 'nonStandard') return isNonStandard(pg.classification);
                                      if (pgTab === 'custom') return isCustom(pg.classification);
                                      return false;
                                    });
                                    
                                    const products = scopedFiltered.reduce<Record<string, PerformanceGuarantee[]>>((acc, pg) => {
                                      const lines = Array.isArray(pg.product_line) && pg.product_line.length > 0
                                        ? pg.product_line
                                        : ['Unassigned'];
                                      lines.forEach((line) => {
                                        const key = line || 'Unassigned';
                                        if (!acc[key]) acc[key] = [];
                                        acc[key].push(pg);
                                      });
                                      return acc;
                                    }, {});
                                    
                                    const summary = policySummaries.find((p) => p.policy_number === policyNumber);
                                    const summaryTotal = summary?.total_pgs ?? summary?.pg_count ?? scopedFiltered.length;
                                    
                                    return (
                                      <div key={policyKey} className="rounded-md border border-gray-300 bg-white shadow-sm overflow-hidden">
                                        <div className="w-full flex items-center gap-3 bg-navy-600 px-4 py-2.5 text-white">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              toggleSection(policyKey);
                                              ensurePolicyPGsLoaded(policyNumber);
                                            }}
                                            className="flex flex-1 min-w-0 items-center gap-3 text-left"
                                          >
                                            <ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform ${isPolicyOpen ? '' : '-rotate-90'}`} />
                                            <FileTextIcon className="h-4 w-4 shrink-0" />
                                            <div className="flex flex-col leading-tight min-w-0">
                                              <span className="text-[10px] uppercase tracking-wide text-white/70">Policy Number</span>
                                              <span className="text-[13px] font-mono font-semibold truncate">{policyNumber}</span>
                                            </div>
                                          </button>
                                          <span className="inline-flex items-center gap-2 shrink-0">
                                            {summary && (summary.pending_review > 0) && (
                                              <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                                                {summary.pending_review} Pending
                                              </span>
                                            )}
                                            {summary && (summary.approved > 0) && (
                                              <span className="rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                                                {summary.approved} Approved
                                              </span>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => handleDeletePolicy(policyNumber)}
                                              disabled={deletingPolicy === policyNumber}
                                              title="Delete Policy"
                                              className="inline-flex items-center rounded border border-white/40 bg-white/10 p-1.5 text-white transition-colors hover:bg-red-500/80 disabled:opacity-50"
                                            >
                                              <Trash2Icon className="h-3.5 w-3.5" />
                                            </button>
                                          </span>
                                        </div>
                                        
                                        {isPolicyOpen && (
                                          <div className="flex flex-col gap-4 p-4 bg-gray-50/60">
                                            {isLoading ? (
                                              <div className="flex items-center justify-center py-8">
                                                <img src="/NylLogo.svg" alt="NYL Logo" className="h-8 w-8 animate-spin-y" />
                                              </div>
                                            ) : !isLoaded ? (
                                              <div className="text-center text-[12.5px] text-gray-500 py-6">
                                                Loading performance guarantees…
                                              </div>
                                            ) : scopedFiltered.length === 0 ? (
                                              <div className="text-center text-[12.5px] text-gray-500 py-6">
                                                {summaryTotal === 0 ? 'No performance guarantees under this policy.' : 'No PGs match the current filter.'}
                                              </div>
                                            ) : (
                                              Object.entries(products).map(([product, list]) => {
                                                const productKey = `${policyKey}:product:${product}`;
                                                const productOpen = openSections[productKey] ?? true;
                                                return (
                                                  <div key={product} className="rounded border border-gray-200 bg-white overflow-hidden">
                                                    <button
                                                      type="button"
                                                      onClick={() => toggleSection(productKey)}
                                                      className="w-full flex items-center gap-2 bg-navy-50 px-3 py-2 text-left transition-colors hover:bg-navy-100"
                                                    >
                                                      <ChevronDownIcon className={`h-3.5 w-3.5 shrink-0 text-navy-700 transition-transform ${productOpen ? '' : '-rotate-90'}`} />
                                                      <span className="text-[10px] font-semibold uppercase tracking-wide text-navy-600">Product</span>
                                                      <span className="text-[12px] font-semibold text-navy-800 truncate">{product}</span>
                                                      <span className="ml-auto rounded bg-white border border-navy-200 px-1.5 py-0.5 text-[10px] font-semibold text-navy-700">
                                                        {list.length}
                                                      </span>
                                                    </button>
                                                    {productOpen && (
                                                      <div className="flex flex-col gap-3 p-3">
                                                        {list.map((pg) => (
                                                          <PGEditor
                                                            key={`${product}:${pg.pg_record_id}`}
                                                            pg={pg}
                                                            onSave={(payload) => handleSavePG(pg, payload)}
                                                            onApprove={(payload, comments, isDirty) => handleApprovePG(pg, payload, comments, isDirty)}
                                                            onOpenReview={(pg) => setReviewDrawerPg(pg)}
                                                            isStandard={isStandard}
                                                            isNonStandard={isNonStandard}
                                                            isCustom={isCustom}
                                                            showValidations={showPgValidations}
                                                          />
                                                        ))}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : policySections.length === 0 ? (
            <div className="rounded-md border border-gray-200 bg-white px-4 py-10 text-center text-[13px] text-gray-500 shadow-sm">
              No policies found for this contract
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {policySections.map((section) => {
                const isOpen = openSections[`policy:${section.key}`] ?? false;
                const isLoaded = pgsByPolicy[section.key] !== undefined;
                const isLoading = pgsByPolicyLoading[section.key] === true;
                const summaryTotal = section.summary?.total_pgs ?? section.summary?.pg_count ?? section.pgs.length;
                return (
                  <div key={section.key} className="rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="w-full flex items-center gap-3 bg-navy-700 px-4 py-2.5 text-white">
                      <button
                        type="button"
                        onClick={() => handleTogglePolicy(section.key)}
                        className="flex flex-1 min-w-0 items-center gap-3 text-left"
                      >
                        <ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                        <FileTextIcon className="h-4 w-4 shrink-0" />
                        <div className="flex flex-col leading-tight min-w-0">
                          <span className="text-[10px] uppercase tracking-wide text-white/70">Policy</span>
                          <span className="text-[13px] font-mono font-semibold truncate">{section.label}</span>
                        </div>
                      </button>
                      <span className="inline-flex items-center gap-2 shrink-0">
                        {section.summary && (section.summary.pending_review > 0) && (
                          <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                            {section.summary.pending_review} Pending
                          </span>
                        )}
                        {section.summary && (section.summary.approved > 0) && (
                          <span className="rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                            {section.summary.approved} Approved
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeletePolicy(section.key)}
                          disabled={deletingPolicy === section.key}
                          title="Delete Policy"
                          className="inline-flex items-center rounded border border-white/40 bg-white/10 p-1.5 text-white transition-colors hover:bg-red-500/80 disabled:opacity-50"
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </div>
                    {isOpen && (
                      <div className="flex flex-col gap-4 p-4 bg-gray-50/60">
                        {isLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <img src="/NylLogo.svg" alt="NYL Logo" className="h-8 w-8 animate-spin-y" />
                          </div>
                        ) : !isLoaded ? (
                          <div className="text-center text-[12.5px] text-gray-500 py-6">
                            Loading performance guarantees…
                          </div>
                        ) : section.pgs.length === 0 ? (
                          <div className="text-center text-[12.5px] text-gray-500 py-6">
                            {summaryTotal === 0 ? 'No performance guarantees under this policy.' : 'No PGs match the current filter.'}
                          </div>
                        ) : (
                          Object.entries(section.products).map(([product, list]) => {
                            const productKey = `policy:${section.key}:product:${product}`;
                            const productOpen = openSections[productKey] ?? true;
                            return (
                              <div key={product} className="rounded border border-gray-200 bg-white overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => toggleSection(productKey)}
                                  className="w-full flex items-center gap-2 bg-navy-50 px-3 py-2 text-left transition-colors hover:bg-navy-100"
                                >
                                  <ChevronDownIcon className={`h-3.5 w-3.5 shrink-0 text-navy-700 transition-transform ${productOpen ? '' : '-rotate-90'}`} />
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-navy-600">Product</span>
                                  <span className="text-[12px] font-semibold text-navy-800 truncate">{product}</span>
                                  <span className="ml-auto rounded bg-white border border-navy-200 px-1.5 py-0.5 text-[10px] font-semibold text-navy-700">
                                    {list.length}
                                  </span>
                                </button>
                                {productOpen && (
                                  <div className="flex flex-col gap-3 p-3">
                                    {list.map((pg) => (
                                      <PGEditor
                                        key={`${product}:${pg.pg_record_id}`}
                                        pg={pg}
                                        onSave={(payload) => handleSavePG(pg, payload)}
                                        onApprove={(payload, comments, isDirty) => handleApprovePG(pg, payload, comments, isDirty)}
                                        onOpenReview={(pg) => setReviewDrawerPg(pg)}
                                        isStandard={isStandard}
                                        isNonStandard={isNonStandard}
                                        isCustom={isCustom}
                                        showValidations={showPgValidations}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {mainTab === 'operational' && showOperationalData && (
        <OperationalDataPanel
          contract={contract}
          policyList={policyList}
        />
      )}

      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="Contract Preview"
        size="80%"
        headerAction={
          documentUrl ? (
            <a
              href={documentUrl}
              download
              className="flex items-center gap-1.5 rounded bg-navy-700 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-navy-800"
            >
              <DownloadIcon className="h-4 w-4" />
              Download
            </a>
          ) : undefined
        }
      >
        <div className="bg-neutral-900 p-6" style={{ minHeight: '80vh' }}>
          {documentUrl ? (
            <iframe
              src={`${documentUrl}#toolbar=0`}
              title={`Preview of ${contract.client_name}`}
              className="mx-auto w-full h-full rounded bg-white shadow-lg"
              style={{ minHeight: '75vh' }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400">Contract preview not available</p>
            </div>
          )}
        </div>
      </Dialog>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <AddPolicyDialog
        open={showAddPolicy}
        onClose={() => setShowAddPolicy(false)}
        contractId={fileId}
        brokerClientOptions={brokerClientOptions}
        defaultBroker={(contract.broker_producer || '').trim()}
        defaultClientName={(contract.client_name || '').trim()}
        onCreated={handlePolicyCreated}
        onError={(message) => setToast({ message, type: 'error' })}
      />

      <AddPGDialog
        open={showAddPG}
        onClose={() => setShowAddPG(false)}
        contractId={fileId}
        policyOptions={policyList.map((pn) => ({
          policy_number: pn,
          product_line: policySummaries.find((p) => p.policy_number === pn)?.product_line ?? null,
        }))}
        brokerClientOptions={brokerClientOptions}
        defaultBroker={(contract.broker_producer || '').trim()}
        defaultClientName={(contract.client_name || '').trim()}
        onCreated={handlePGCreated}
        onError={(message) => setToast({ message, type: 'error' })}
      />

      <PGReviewDrawer
        open={reviewDrawerPg !== null}
        onClose={() => setReviewDrawerPg(null)}
        pg={reviewDrawerPg}
        resolveReviewId={resolveReviewId}
        onDecision={(pg, action, comments) => handleReviewDecision(pg, action, comments)}
      />
    </div>
  );
}

function PGEditor({
  pg,
  onSave,
  onApprove,
  onOpenReview,
  isStandard,
  isNonStandard,
  isCustom,
  showValidations,
}: {
  pg: PerformanceGuarantee;
  onSave: (payload: UpdatePGPayload) => Promise<PerformanceGuarantee | null>;
  onApprove: (payload: Partial<UpdatePGPayload>, comments: string, isDirty: boolean) => Promise<PerformanceGuarantee | null>;
  onOpenReview: (pg: PerformanceGuarantee) => void;
  isStandard: (c: string) => boolean;
  isNonStandard: (c: string) => boolean;
  isCustom: (c: string) => boolean;
  showValidations: boolean;
}) {
  const buildInitial = (source: PerformanceGuarantee) => ({
    threshold_value: source.threshold_value ?? '',
    threshold_unit: source.threshold_unit ?? '',
    basis_of_measurement: source.basis_of_measurement ?? '',
    notes: source.notes ?? '',
    penalty_allocation_percentage: source.penalty_allocation_pct ?? '',
    classification: source.classification ?? '',
    classification_reason: source.classification_reason ?? '',
    comments: source.review_comments ?? '',
  });

  const [original, setOriginal] = useState(() => buildInitial(pg));
  const [form, setForm] = useState(() => buildInitial(pg));
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const initial = buildInitial(pg);
    setOriginal(initial);
    setForm(initial);
  }, [pg.pg_record_id, pg.updated_at, pg.current_version]);

  const isDirty =
    form.threshold_value !== original.threshold_value ||
    form.threshold_unit !== original.threshold_unit ||
    form.basis_of_measurement !== original.basis_of_measurement ||
    form.notes !== original.notes ||
    form.penalty_allocation_percentage !== original.penalty_allocation_percentage ||
    form.classification !== original.classification ||
    form.classification_reason !== original.classification_reason ||
    form.comments !== original.comments;

  const setField = (name: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRevert = () => {
    setForm(original);
  };

  const buildUpdatePayload = (): UpdatePGPayload => ({
    threshold_value: form.threshold_value === '' ? null : isNaN(Number(form.threshold_value)) ? String(form.threshold_value) : Number(form.threshold_value),
    threshold_unit: form.threshold_unit || null,
    basis_of_measurement: form.basis_of_measurement || null,
    notes: form.notes || null,
    penalty_allocation_percentage: form.penalty_allocation_percentage === '' ? null : Number(form.penalty_allocation_percentage),
    classification: form.classification || null,
    classification_reason: form.classification_reason || null,
    comments: form.comments || null,
  });

  // Only the fields whose value differs from the loaded PG — this is what gets recorded
  // as analyst_edits on the review, so it must not include untouched fields.
  const buildChangedPayload = (): Partial<UpdatePGPayload> => {
    const full = buildUpdatePayload();
    const changed: Partial<UpdatePGPayload> = {};
    (Object.keys(full) as (keyof UpdatePGPayload)[]).forEach((key) => {
      if (key === 'comments') return;
      if (String(form[key as keyof typeof form] ?? '') !== String(original[key as keyof typeof original] ?? '')) {
        (changed as any)[key] = full[key];
      }
    });
    return changed;
  };

  const handleSave = async () => {
    setSaving(true);
    const updated = await onSave(buildUpdatePayload());
    if (updated) {
      const next = buildInitial(updated);
      setOriginal(next);
      setForm(next);
    }
    setSaving(false);
  };

  const handleApprove = async () => {
    setApproving(true);
    const changed = buildChangedPayload();
    const updated = await onApprove(changed, form.comments, Object.keys(changed).length > 0);
    if (updated) {
      const next = buildInitial(updated);
      setOriginal(next);
      setForm(next);
    }
    setApproving(false);
  };

  const classificationValue = String(form.classification || '').toUpperCase();
  const classificationTone =
    isStandard(classificationValue) ? 'text-green-700 bg-green-50 border-green-200' :
    isNonStandard(classificationValue) ? 'text-amber-700 bg-amber-50 border-amber-200' :
    isCustom(classificationValue) ? 'text-red-700 bg-red-50 border-red-200' :
    'text-gray-700 bg-gray-50 border-gray-200';

  const confidenceValue = parseFloat(pg.confidence_score || '0');
  const reviewStatus = pg.review_status === 'PENDING_REVIEW' ? 'Pending' : pg.review_status || '—';
  const statusColor =
    pg.review_status === 'APPROVED' ? 'text-green-700 bg-green-50 border-green-200' :
    pg.review_status === 'REJECTED' ? 'text-red-700 bg-red-50 border-red-200' :
    'text-amber-700 bg-amber-50 border-amber-200';

  return (
    <div className={`rounded-md border ${isDirty ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200'} bg-white shadow-sm overflow-hidden`}>
      <div className="w-full flex items-center gap-3 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 min-w-0 items-center gap-3 text-left"
        >
          <ChevronDownIcon className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? '' : '-rotate-90'}`} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono font-semibold text-navy-700 bg-navy-50 rounded px-1.5 py-0.5">{pg.pg_id}</span>
              <span className="text-[13px] font-semibold text-navy-800 truncate">{pg.pg_sub_category || pg.pg_metric_name || 'Performance Guarantee'}</span>
              {isDirty && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                  <AlertCircleIcon className="h-3 w-3" />
                  Unsaved
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
              <span>Confidence: <span className="font-semibold text-gray-700">{confidenceValue ? confidenceValue.toFixed(2) : '—'}</span></span>
            </div>
          </div>
        </button>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0 ${classificationTone}`}>
          {classificationValue || 'UNCLASSIFIED'}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0 ${statusColor}`}>
          {reviewStatus}
        </span>
        <button
          type="button"
          onClick={() => onOpenReview(pg)}
          title="Open review drawer (version history & decision)"
          className="inline-flex items-center gap-1 rounded border border-navy-200 bg-navy-50 px-2 py-1 text-[11px] font-semibold text-navy-700 shrink-0 transition-colors hover:bg-navy-100"
        >
          <SendIcon className="h-3.5 w-3.5" />
          Review
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-200 bg-gray-50/50 px-4 py-4">
          {(pg.review_status === 'APPROVED' || pg.review_status === 'APPROVED_WITH_EDITS') && isDirty && (
            <div className="mb-3 flex items-start gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-2">
              <AlertCircleIcon className="h-4 w-4 mt-0.5 shrink-0 text-amber-700" />
              <div className="text-[12px] text-amber-900 leading-relaxed">
                <span className="font-semibold">Post-approval edit.</span> Saving these changes will re-open this PG for review (contract term change flow).
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <FormField label="Threshold Value">
              <input
                type="text"
                value={form.threshold_value}
                onChange={(e) => setField('threshold_value', e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700"
              />
            </FormField>
            <FormField label="Threshold Unit">
              <input
                type="text"
                value={form.threshold_unit}
                onChange={(e) => setField('threshold_unit', e.target.value)}
                placeholder="e.g. PERCENTAGE, DAYS_BUSINESS"
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700"
              />
            </FormField>
            <FormField label="Penalty Allocation %">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.penalty_allocation_percentage}
                onChange={(e) => setField('penalty_allocation_percentage', e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700"
              />
            </FormField>
            <FormField label="Basis of Measurement">
              <input
                type="text"
                value={form.basis_of_measurement}
                onChange={(e) => setField('basis_of_measurement', e.target.value)}
                placeholder="e.g. CLIENT_SPECIFIC, BOOK_OF_BUSINESS"
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700"
              />
            </FormField>
            <FormField label="Classification">
              <select
                value={form.classification}
                onChange={(e) => setField('classification', e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700"
              >
                <option value="">Select…</option>
                <option value="STANDARD">STANDARD</option>
                <option value="NON_STANDARD">NON_STANDARD</option>
                <option value="CUSTOM_NEW">CUSTOM_NEW</option>
              </select>
            </FormField>
            <div />
            <FormField label="Classification Reason" className="md:col-span-2 lg:col-span-3">
              <textarea
                rows={2}
                value={form.classification_reason}
                onChange={(e) => setField('classification_reason', e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 resize-y"
              />
            </FormField>
            <FormField label="Notes" className="md:col-span-2 lg:col-span-3">
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 resize-y"
              />
            </FormField>
            <FormField label="Review Comment" className="md:col-span-2 lg:col-span-3">
              <textarea
                rows={2}
                value={form.comments}
                onChange={(e) => setField('comments', e.target.value)}
                placeholder="Reviewer comment for this update"
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 resize-y"
              />
            </FormField>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-3">
            <button
              type="button"
              onClick={handleRevert}
              disabled={!isDirty || saving || approving}
              className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcwIcon className="h-3.5 w-3.5" />
              Revert to Original
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || saving || approving}
              className="inline-flex items-center gap-1.5 rounded bg-navy-700 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SaveIcon className="h-3.5 w-3.5" />
              {saving ? 'Saving…' : 'Save as Draft'}
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={saving || approving}
              className="inline-flex items-center gap-1.5 rounded bg-green-700 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCheckIcon className="h-3.5 w-3.5" />
              {approving ? 'Approving…' : 'Save & Approve'}
            </button>
          </div>

          {showValidations && pg.pg_validations && pg.pg_validations.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Validations ({pg.pg_validations.length})</div>
              <div className="flex flex-col gap-2">
                {pg.pg_validations.map((v, i) => (
                  <ValidationCard key={`${v.rule_id}-${i}`} validation={v} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FormField({ label, children, className = '', error }: { label: string; children: React.ReactNode; className?: string; error?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
      {error && <span className="text-[11px] font-medium text-red-600">{error}</span>}
    </div>
  );
}

function HierarchyNode({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-700 text-white">
        {icon}
      </div>
      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <span className="text-[13px] font-semibold text-navy-800 truncate">{value}</span>
      </div>
    </div>
  );
}

type OperationalUpload = {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  policyNumber: string;
};

function OperationalDataPanel({ contract, policyList }: { contract: ContractDetails; policyList: string[] }) {
  const [claims, setClaims] = useState<OperationalUpload[]>([]);
  const [callQuality, setCallQuality] = useState<OperationalUpload[]>([]);
  const [claimsPolicy, setClaimsPolicy] = useState<string>(policyList[0] || '');
  const [callPolicy, setCallPolicy] = useState<string>(policyList[0] || '');

  const handleUpload = (
    files: FileList | null,
    setter: (updater: (prev: OperationalUpload[]) => OperationalUpload[]) => void,
    policyNumber: string
  ) => {
    if (!files || files.length === 0) return;
    const now = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    const items: OperationalUpload[] = Array.from(files).map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`,
      name: f.name,
      size: f.size,
      uploadedAt: now,
      policyNumber,
    }));
    setter((prev) => [...items, ...prev]);
  };

  const totalClaims = claims.length;
  const totalCallQuality = callQuality.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
        <InfoIcon className="h-4 w-4 mt-0.5 text-blue-700 shrink-0" />
        <div className="text-[12.5px] text-blue-900 leading-relaxed">
          <div className="font-semibold mb-0.5">Operational Data Integration (Preview)</div>
          Upload Claims and Call Quality extracts to associate them with this contract's policies and Performance Guarantees. Once linked, operational metrics can be measured against contract obligations.
        </div>
      </div>

      <div className="rounded-md border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 border-b border-gray-100">
          <HierarchyNode icon={<BriefcaseIcon className="h-3.5 w-3.5" />} label="Broker" value={contract.broker_producer || '—'} />
          <ChevronRightIcon className="h-4 w-4 text-gray-400 hidden md:block" />
          <HierarchyNode icon={<Building2Icon className="h-3.5 w-3.5" />} label="Client" value={contract.client_name || '—'} />
          <ChevronRightIcon className="h-4 w-4 text-gray-400 hidden md:block" />
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Policies</div>
            {policyList.map((pn) => (
              <span key={pn} className="inline-flex items-center rounded border border-navy-200 bg-navy-50 px-2 py-0.5 text-[11px] font-mono font-semibold text-navy-700">
                {pn}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UploadCard
          title="Claims Data"
          description="CSV, XLSX or JSON export from claims system"
          icon={<ClipboardListIcon className="h-4 w-4" />}
          policyList={policyList}
          selectedPolicy={claimsPolicy}
          onPolicyChange={setClaimsPolicy}
          uploads={claims}
          totalUploads={totalClaims}
          onFiles={(files) => handleUpload(files, setClaims, claimsPolicy)}
          onRemove={(id) => setClaims((prev) => prev.filter((u) => u.id !== id))}
        />
        <UploadCard
          title="Call Quality Data"
          description="Call Quality audit / QA scoring exports"
          icon={<PhoneCallIcon className="h-4 w-4" />}
          policyList={policyList}
          selectedPolicy={callPolicy}
          onPolicyChange={setCallPolicy}
          uploads={callQuality}
          totalUploads={totalCallQuality}
          onFiles={(files) => handleUpload(files, setCallQuality, callPolicy)}
          onRemove={(id) => setCallQuality((prev) => prev.filter((u) => u.id !== id))}
        />
      </div>

      <div className="rounded-md border border-gray-200 bg-white shadow-sm">
        <div className="flex h-9 items-center justify-between bg-navy-700 px-3 text-white">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            <h2 className="text-[13px] font-semibold">Metric Linkage (Coming Soon)</h2>
          </div>
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 uppercase tracking-wide">Preview</span>
        </div>
        <div className="p-4">
          <div className="text-[12.5px] text-gray-600 mb-3">
            Once Claims and Call Quality datasets are uploaded, they will be automatically linked to matching Performance Guarantees to compute actual vs. contract-obligated performance.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11.5px]">
            <LinkageRow left="Claim Team Satisfaction" right="Claims: Satisfaction score" />
            <LinkageRow left="Average Speed to Answer" right="Call Quality: ASA measurement" />
            <LinkageRow left="Abandonment Rate" right="Call Quality: Abandonment %" />
            <LinkageRow left="STD Decision Time" right="Claims: Decision cycle time" />
            <LinkageRow left="LTD Decision Time" right="Claims: Decision cycle time" />
            <LinkageRow left="STD Financial Accuracy" right="Claims: Payment accuracy" />
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadCard({
  title,
  description,
  icon,
  policyList,
  selectedPolicy,
  onPolicyChange,
  uploads,
  totalUploads,
  onFiles,
  onRemove,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  policyList: string[];
  selectedPolicy: string;
  onPolicyChange: (v: string) => void;
  uploads: OperationalUpload[];
  totalUploads: number;
  onFiles: (files: FileList | null) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div className="rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex h-9 items-center justify-between bg-navy-700 px-3 text-white">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-[13px] font-semibold">{title}</h2>
        </div>
        <span className="rounded bg-white/20 px-1.5 py-0.5 text-[11px] font-semibold">
          {totalUploads} file{totalUploads === 1 ? '' : 's'}
        </span>
      </div>
      <div className="p-4">
        <div className="text-[12px] text-gray-600 mb-3">{description}</div>
        <div className="mb-3">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Associate with policy</label>
          <select
            value={selectedPolicy}
            onChange={(e) => onPolicyChange(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700"
          >
            {policyList.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files); }}
          className={`flex flex-col items-center justify-center gap-2 rounded border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragging ? 'border-navy-700 bg-navy-50' : 'border-gray-300 bg-gray-50'
          }`}
        >
          <UploadCloudIcon className="h-8 w-8 text-navy-700" />
          <div className="text-[12.5px] text-gray-700">
            Drag &amp; drop files here or{' '}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="font-semibold text-navy-700 underline hover:text-navy-800"
            >
              browse
            </button>
          </div>
          <div className="text-[10.5px] text-gray-400">CSV, XLSX, JSON (Max 20MB)</div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.xls,.json"
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>

        {uploads.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {uploads.map((u) => (
              <div key={u.id} className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2">
                <FileTextIcon className="h-4 w-4 shrink-0 text-navy-700" />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium text-gray-800 truncate">{u.name}</div>
                  <div className="text-[10.5px] text-gray-500">
                    {(u.size / 1024).toFixed(1)} KB · Policy {u.policyNumber} · {u.uploadedAt}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(u.id)}
                  aria-label="Remove file"
                  className="rounded p-1 text-red-600 transition-colors hover:bg-red-50"
                >
                  <XCircleIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LinkageRow({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-2.5 py-2">
      <span className="rounded bg-white border border-navy-200 px-1.5 py-0.5 text-navy-700 font-medium truncate">{left}</span>
      <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      <span className="text-gray-700 truncate">{right}</span>
    </div>
  );
}

type ValidationGroupKey = 'FAIL' | 'WARN' | 'INFO' | 'PASS';

const VALIDATION_GROUPS: {
  key: ValidationGroupKey;
  label: string;
  matches: (status: string) => boolean;
  badge: string;
  header: string;
  border: string;
  icon: React.ReactNode;
}[] = [
  { key: 'PASS', label: 'Passed', matches: (s) => s === 'PASS', badge: 'bg-green-600', header: 'bg-green-50 text-green-900 hover:bg-green-100', border: 'border-green-200', icon: <CheckCircle2Icon className="h-4 w-4 text-green-600" /> },
  // SKIP is informational too — nothing was evaluated, nothing failed.
  { key: 'INFO', label: 'Info', matches: (s) => s === 'INFO' || s === 'SKIP', badge: 'bg-blue-600', header: 'bg-blue-50 text-blue-900 hover:bg-blue-100', border: 'border-blue-200', icon: <InfoIcon className="h-4 w-4 text-blue-600" /> },
  { key: 'WARN', label: 'Warnings', matches: (s) => s === 'WARN', badge: 'bg-amber-500', header: 'bg-amber-50 text-amber-900 hover:bg-amber-100', border: 'border-amber-200', icon: <AlertCircleIcon className="h-4 w-4 text-amber-600" /> },
  { key: 'FAIL', label: 'Failed', matches: (s) => s === 'FAIL', badge: 'bg-red-600', header: 'bg-red-50 text-red-900 hover:bg-red-100', border: 'border-red-200', icon: <XCircleIcon className="h-4 w-4 text-red-600" /> },
];

function ContractValidationsPanel({ validations }: { validations: ContractValidation[] }) {
  const groups = VALIDATION_GROUPS
    .map((g) => ({ ...g, items: validations.filter((v) => g.matches(v.status)) }))
    .filter((g) => g.items.length > 0);

  // Problems open by default so they're seen first; passed/info start collapsed.
  const [openGroups, setOpenGroups] = useState<Set<ValidationGroupKey>>(
    () => new Set(groups.filter((g) => g.key === 'FAIL' || g.key === 'WARN').map((g) => g.key)),
  );
  const sectionRefs = useRef<Partial<Record<ValidationGroupKey, HTMLDivElement | null>>>({});

  const toggleGroup = (key: ValidationGroupKey) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Header badge: open that group (if closed) and scroll to it.
  const jumpToGroup = (key: ValidationGroupKey) => {
    setOpenGroups((prev) => new Set(prev).add(key));
    requestAnimationFrame(() => {
      sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="rounded-md border border-gray-200 bg-white shadow-sm">
      <div className="flex h-9 items-center justify-between bg-navy-700 px-3 text-white">
        <h2 className="text-[13px] font-semibold">Contract Validations ({validations.length})</h2>
        <div className="flex items-center gap-2 text-[11px]">
          {groups.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => jumpToGroup(g.key)}
              title={`Jump to ${g.label}`}
              className={`rounded px-1.5 py-0.5 font-bold transition-opacity hover:opacity-85 ${g.badge}`}
            >
              {g.items.length} {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {groups.map((g) => {
          const isOpen = openGroups.has(g.key);
          return (
            <div
              key={g.key}
              ref={(el) => { sectionRefs.current[g.key] = el; }}
              className={`rounded-md border ${g.border} overflow-hidden scroll-mt-4`}
            >
              <button
                type="button"
                onClick={() => toggleGroup(g.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${g.header}`}
              >
                {g.icon}
                <span className="text-[12.5px] font-semibold">{g.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${g.badge}`}>{g.items.length}</span>
                <ChevronDownIcon className={`h-4 w-4 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="flex flex-col gap-2 p-3 bg-white">
                  {g.items.map((v, i) => (
                    <ValidationCard key={`${v.rule_id}-${i}`} validation={v} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ValidationCard({ validation }: { validation: PGValidation | ContractValidation }) {
  const [expanded, setExpanded] = useState(false);
  const def = validation.rule_definition;

  const statusColor =
    validation.status === 'PASS' ? 'bg-green-50 border-green-200 text-green-800' :
    validation.status === 'FAIL' ? 'bg-red-50 border-red-200 text-red-800' :
    validation.status === 'WARN' ? 'bg-amber-50 border-amber-200 text-amber-800' :
    validation.status === 'SKIP' ? 'bg-gray-100 border-gray-300 text-gray-700' :
    'bg-blue-50 border-blue-200 text-blue-800';

  const statusBadge =
    validation.status === 'PASS' ? 'bg-green-600' :
    validation.status === 'FAIL' ? 'bg-red-600' :
    validation.status === 'WARN' ? 'bg-amber-500' :
    validation.status === 'SKIP' ? 'bg-gray-500' :
    'bg-blue-600';

  const icon =
    validation.status === 'PASS' ? <CheckCircle2Icon className="h-4 w-4" /> :
    validation.status === 'FAIL' ? <XCircleIcon className="h-4 w-4" /> :
    validation.status === 'WARN' ? <AlertCircleIcon className="h-4 w-4" /> :
    <InfoIcon className="h-4 w-4" />;

  const extraFields = def
    ? Object.entries(def).filter(([k]) =>
        !['id', 'name', 'enabled', 'message_template', 'pass_when', 'fail_when', 'warn_when', 'info_when'].includes(k)
      )
    : [];

  return (
    <div className={`rounded border ${statusColor} overflow-hidden`}>
      <div
        className={`flex items-start gap-2 px-3 py-2 ${def ? 'cursor-pointer hover:brightness-95' : ''}`}
        onClick={() => def && setExpanded(!expanded)}
      >
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${statusBadge}`}>
              {validation.status}
            </span>
            <span className="text-[11px] font-mono font-semibold text-gray-700 bg-white/60 rounded px-1.5 py-0.5">
              {validation.rule_id}
            </span>
            {def?.name && (
              <span className="text-[12px] font-semibold text-navy-800">{def.name}</span>
            )}
            {def?.enabled === false && (
              <span className="text-[10px] font-semibold text-gray-500 uppercase">Disabled</span>
            )}
          </div>
          <div className="text-[12px] break-words">{validation.message}</div>
        </div>
        {def && (
          <ChevronDownIcon
            className={`h-4 w-4 text-gray-500 mt-1 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        )}
      </div>

      {expanded && def && (
        <div className="border-t border-current/10 bg-white/60 px-3 py-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {def.pass_when && <RuleConditionRow label="Pass When" value={def.pass_when} tone="pass" />}
            {def.fail_when && <RuleConditionRow label="Fail When" value={def.fail_when} tone="fail" />}
            {def.warn_when && <RuleConditionRow label="Warn When" value={def.warn_when} tone="warn" />}
            {def.info_when && <RuleConditionRow label="Info When" value={def.info_when} tone="info" />}
            {def.message_template && <RuleConditionRow label="Message Template" value={def.message_template} tone="neutral" />}
          </div>
          {extraFields.length > 0 && (
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
              {extraFields.map(([key, value]) => (
                <RuleConditionRow
                  key={key}
                  label={key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  value={Array.isArray(value) ? value.join(', ') : String(value)}
                  tone="neutral"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RuleConditionRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'pass' | 'fail' | 'warn' | 'info' | 'neutral';
}) {
  const toneClass =
    tone === 'pass' ? 'text-green-700' :
    tone === 'fail' ? 'text-red-700' :
    tone === 'warn' ? 'text-amber-700' :
    tone === 'info' ? 'text-blue-700' :
    'text-gray-700';
  return (
    <div className="rounded border border-gray-200 bg-white px-2.5 py-1.5">
      <div className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${toneClass}`}>{label}</div>
      <div className="text-[12px] text-gray-800 break-words font-mono">{value}</div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  const displayValue = value && value !== '' ? value : '—';
  return (
    <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-[13px] font-medium text-navy-800 break-words">{displayValue}</div>
    </div>
  );
}

function ExceptionCard({ exception }: { exception: ExtractionException }) {
  const typeColor =
    exception.exception_type === 'NATURAL_DISASTER' ? 'bg-red-600' :
    exception.exception_type === 'REGULATORY_RESTRICTION' ? 'bg-purple-600' :
    exception.exception_type === 'THIRD_PARTY_DELAY' ? 'bg-blue-600' :
    exception.exception_type === 'CLIENT_DELAY' ? 'bg-amber-500' :
    exception.exception_type === 'EXTERNAL_DELAY' ? 'bg-orange-500' :
    'bg-gray-600';

  return (
    <div className="rounded border border-gray-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${typeColor}`}>
          {exception.exception_type.replace(/_/g, ' ')}
        </span>
        <span className="text-[11px] font-mono font-semibold text-gray-700 bg-gray-100 rounded px-1.5 py-0.5">
          {exception.affected_field}
        </span>
      </div>
      <div className="text-[12px] text-gray-800 break-words leading-relaxed">
        {exception.description}
      </div>
    </div>
  );
}

const FIELD_LABEL_OVERRIDES: Record<string, string> = {
  pg_metric_name: 'PG Metric Name',
  metric_master_match: 'Metric Master Match',
  non_standard_patterns: 'Non-Standard Patterns',
  volume_threshold_type: 'Volume Threshold Type',
  volume_comparison_operator: 'Volume Comparison Operator',
  volume_exception_notes: 'Volume Exception Notes',
};

// Converts raw backend field names (e.g. "threshold_value") into a readable label ("Threshold Value").
function formatFieldLabel(field: string): string {
  if (FIELD_LABEL_OVERRIDES[field]) return FIELD_LABEL_OVERRIDES[field];
  return field
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function PGReviewDrawer({
  open,
  onClose,
  pg,
  resolveReviewId,
  onDecision,
}: {
  open: boolean;
  onClose: () => void;
  pg: PerformanceGuarantee | null;
  resolveReviewId: (pg: PerformanceGuarantee) => Promise<string | null>;
  onDecision: (pg: PerformanceGuarantee, action: ReviewAction, comments: string) => Promise<PerformanceGuarantee | null>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReviewItemDetail | null>(null);
  const [comments, setComments] = useState('');
  const [submittingAction, setSubmittingAction] = useState<ReviewAction | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  // Which version's edits the "Fields Edited" section is showing; null = default (latest edited version).
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  // Which edited-field badge is expanded to show its old -> new values.
  const [expandedField, setExpandedField] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !pg) {
      setDetail(null);
      setError(null);
      setComments('');
      setSelectedVersion(null);
      setExpandedField(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setDetail(null);
      try {
        const reviewId = await resolveReviewId(pg);
        if (!reviewId) {
          if (!cancelled) setError('No pending review found for this PG.');
          return;
        }
        const result = await getReviewItem(reviewId);
        if (!cancelled) setDetail(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load review details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pg?.pg_record_id]);

  const handleDecision = async (action: ReviewAction) => {
    if (!pg) return;
    setSubmittingAction(action);
    const updated = await onDecision(pg, action, comments);
    setSubmittingAction(null);
    if (updated) onClose();
  };

  // analyst_edits keys use API request names; snapshots sometimes use DB column names.
  const SNAPSHOT_KEY_ALIASES: Record<string, string[]> = {
    penalty_allocation_percentage: ['penalty_allocation_pct'],
    minimum_volume_threshold: ['min_volume_threshold'],
    minimum_volume_fallback: ['min_volume_fallback'],
  };
  const readSnapshotValue = (snapshot: any, field: string): unknown => {
    if (!snapshot) return undefined;
    if (field in snapshot) return snapshot[field];
    for (const alias of SNAPSHOT_KEY_ALIASES[field] ?? []) {
      if (alias in snapshot) return snapshot[alias];
    }
    return undefined;
  };
  // edit_reason / comments are decision metadata, not PG fields — excluded from the diff.
  const META_EDIT_KEYS = new Set(['edit_reason', 'comments']);
  const formatValue = (v: unknown): string => {
    if (v === null || v === undefined || v === '') return '—';
    if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };
  // Numeric strings like "95.0000" vs 95 must compare equal.
  const normalize = (v: unknown): string => {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(v);
    if (typeof v !== 'object' && v !== '' && !Number.isNaN(n)) return String(n);
    return formatValue(v);
  };

  type FieldChange = { field: string; before: unknown; after: unknown };
  // Real per-version diff: compare each recorded analyst_edits key against the previous
  // version's snapshot and keep only keys whose value actually changed. Older reviews
  // recorded every editor field (even untouched ones), so analyst_edits alone over-reports.
  const computeChanges = (v: PGHistoryItem): FieldChange[] => {
    const edits: Record<string, unknown> = v.pg_snapshot?.analyst_edits ?? {};
    const prev = detail?.versionHistory?.find((h) => h.version_number === v.version_number - 1);
    return Object.keys(edits)
      .filter((k) => !META_EDIT_KEYS.has(k))
      .map((field) => ({
        field,
        before: readSnapshotValue(prev?.pg_snapshot, field),
        after: readSnapshotValue(v.pg_snapshot, field) ?? edits[field],
      }))
      .filter((c) => !prev || normalize(c.before) !== normalize(c.after));
  };
  const changesByVersion = new Map<number, FieldChange[]>();
  for (const v of detail?.versionHistory ?? []) changesByVersion.set(v.version_number, computeChanges(v));

  const versionsWithEdits = (detail?.versionHistory ?? []).filter(
    (v) => (changesByVersion.get(v.version_number)?.length ?? 0) > 0,
  );
  const latestEditedVersion = versionsWithEdits.reduce<PGHistoryItem | null>(
    (best, v) => (!best || v.version_number > best.version_number ? v : best),
    null,
  );
  const activeVersion = selectedVersion != null
    ? detail?.versionHistory?.find((v) => v.version_number === selectedVersion) ?? null
    : latestEditedVersion;
  const activeChanges = activeVersion ? changesByVersion.get(activeVersion.version_number) ?? [] : [];
  const activeEditReason: string | null = activeVersion?.pg_snapshot?.analyst_edits?.edit_reason ?? null;

  const selectVersion = (versionNumber: number) => {
    setSelectedVersion((prev) => (prev === versionNumber ? null : versionNumber));
    setExpandedField(null);
  };

  return (
    <Drawer open={open} onClose={onClose} title={pg ? `Review · ${pg.pg_id}` : 'Review'} width="w-[560px]">
      {!pg ? null : loading ? (
        <div className="flex items-center justify-center py-16">
          <img src="/NylLogo.svg" alt="NYL Logo" className="h-8 w-8 animate-spin-y" />
        </div>
      ) : error ? (
        <div className="m-4 rounded border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-800">
          {error}
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 flex flex-col gap-3 px-4 pt-4">
            <div>
              <div className="text-[13px] font-semibold text-navy-800">
                {pg.pg_sub_category || pg.pg_metric_name || pg.pg_id}
              </div>
              <div className="mt-0.5 text-[11.5px] text-gray-500">{pg.pg_category}</div>
            </div>

            {detail?.priorityExplanation && (
              <div className="flex items-start gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-2">
                <InfoIcon className="h-4 w-4 mt-0.5 shrink-0 text-blue-700" />
                <div className="text-[12px] text-blue-900 leading-relaxed">{detail.priorityExplanation}</div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 px-4 py-3">
          {activeVersion && activeChanges.length > 0 && (
            <div className="flex flex-col rounded-lg border border-amber-200 overflow-hidden">
              <div className="shrink-0 flex items-center gap-2 bg-amber-50 px-3 py-2 border-b border-amber-200">
                <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide">Fields Edited by Analyst</span>
                <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white">v{activeVersion.version_number}</span>
                <span className="ml-auto text-[11px] text-amber-800">{activeChanges.length} change{activeChanges.length === 1 ? '' : 's'}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {activeChanges.map((c) => {
                  const isExpanded = expandedField === c.field;
                  const before = formatValue(c.before);
                  const after = formatValue(c.after);
                  return (
                    <button
                      key={c.field}
                      type="button"
                      onClick={() => setExpandedField((prev) => (prev === c.field ? null : c.field))}
                      className="w-full text-left px-3 py-2 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-navy-800">{formatFieldLabel(c.field)}</span>
                        <ChevronDownIcon className={`h-3.5 w-3.5 ml-auto text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                      {isExpanded ? (
                        <div className="mt-1.5 grid grid-cols-[52px_1fr] gap-x-2 gap-y-1 text-[12px]">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-red-600 pt-0.5">Before</span>
                          <span className="rounded bg-red-50 px-2 py-1 text-red-900 whitespace-pre-wrap break-words">{before}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-green-700 pt-0.5">After</span>
                          <span className="rounded bg-green-50 px-2 py-1 font-medium text-green-900 whitespace-pre-wrap break-words">{after}</span>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-gray-500 min-w-0">
                          <span className="truncate max-w-[45%] text-red-800/80 line-through">{before}</span>
                          <span className="shrink-0">→</span>
                          <span className="truncate text-green-800 font-medium">{after}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {activeEditReason && (
                <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-3 py-2 text-[11.5px] text-gray-700">
                  <span className="font-semibold text-gray-600">Reason: </span>{activeEditReason}
                </div>
              )}
            </div>
          )}

          {detail?.versionHistory && detail.versionHistory.length > 0 && (
            <div className="flex flex-col rounded border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className="shrink-0 w-full flex items-center gap-2 bg-navy-50 px-3 py-2 text-left transition-colors hover:bg-navy-100"
              >
                <HistoryIcon className="h-3.5 w-3.5 text-navy-700" />
                <span className="text-[11.5px] font-semibold text-navy-800">Version History ({detail.versionHistory.length})</span>
                <ChevronDownIcon className={`h-3.5 w-3.5 ml-auto text-navy-700 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
              </button>
              {historyOpen && (
                <div className="flex flex-col divide-y divide-gray-100">
                  {detail.versionHistory.map((v) => {
                    const changeCount = changesByVersion.get(v.version_number)?.length ?? 0;
                    const hasEdits = changeCount > 0;
                    const isActive = activeVersion?.version_id === v.version_id;
                    return (
                      <div
                        key={v.version_id}
                        role={hasEdits ? 'button' : undefined}
                        tabIndex={hasEdits ? 0 : undefined}
                        onClick={hasEdits ? () => selectVersion(v.version_number) : undefined}
                        onKeyDown={hasEdits ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectVersion(v.version_number); } } : undefined}
                        title={hasEdits ? 'Show fields changed in this version' : undefined}
                        className={`px-3 py-2 border-l-2 transition-colors ${
                          isActive ? 'border-amber-500 bg-amber-50/60' : 'border-transparent'
                        } ${hasEdits ? 'cursor-pointer hover:bg-amber-50/40' : ''}`}
                      >
                        <div className="flex items-center gap-2 text-[11.5px]">
                          <span className="font-semibold text-navy-800">v{v.version_number}</span>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">{formatFieldLabel(v.change_action)}</span>
                          {hasEdits && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isActive ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
                              {changeCount} change{changeCount === 1 ? '' : 's'}
                            </span>
                          )}
                          <span className="ml-auto flex items-center gap-1 text-gray-500 whitespace-nowrap">
                            <ClockIcon className="h-3 w-3" />
                            {new Date(v.changed_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                          <UserIcon className="h-3 w-3" />
                          {v.changed_by}
                        </div>
                        {v.change_reason && (
                          <div className="mt-1 text-[11.5px] text-gray-700">{v.change_reason}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-200 bg-white px-4 py-3">
          <FormField label="Comments">
            <textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Reviewer comment for this decision"
              className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 resize-none"
            />
          </FormField>

          {/* Backend /decision endpoint only accepts action=APPROVE; corrections go through
              editedFields on approve (PG editor), so REJECT/REQUEST_CHANGES are not offered. */}
          <button
            type="button"
            onClick={() => handleDecision('APPROVE')}
            disabled={submittingAction !== null}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded bg-green-700 px-3 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCheckIcon className="h-3.5 w-3.5" />
            {submittingAction === 'APPROVE' ? 'Approving…' : 'Approve'}
          </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}

// Confirmed valid enum values from the backend's PolicyCreate/PolicyUpdate validation error.
const STATUS_OPTIONS = ['ACTIVE', 'RENEWED', 'CANCELLED', 'UNKNOWN'];
const PRODUCT_LINE_OPTIONS = ['STD', 'LTD', 'FMLA', 'LIFE', 'VB', 'AD&D'];

function AddPolicyDialog({
  open,
  onClose,
  contractId,
  brokerClientOptions,
  defaultBroker,
  defaultClientName,
  onCreated,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  contractId: string;
  brokerClientOptions: { broker: string; clients: string[] }[];
  defaultBroker: string;
  defaultClientName: string;
  onCreated: (policyNumber: string) => void;
  onError: (message: string) => void;
}) {
  // The contract's own broker/client can be blank/null; fall back to the first
  // known broker/client pair so the select never sits on an unmatched value.
  const resolveDefaults = () => {
    const broker = defaultBroker || brokerClientOptions[0]?.broker || '';
    const clients = brokerClientOptions.find((o) => o.broker === broker)?.clients ?? [];
    const client = defaultClientName && clients.includes(defaultClientName) ? defaultClientName : (clients[0] ?? defaultClientName ?? '');
    return { broker, client };
  };

  const emptyForm = {
    broker_producer: resolveDefaults().broker,
    client_name: resolveDefaults().client,
    policy_number: '',
    product_line: '',
    effective_date: '',
    end_date: '',
    status: 'ACTIVE',
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  useEffect(() => {
    if (open) {
      const { broker, client } = resolveDefaults();
      setForm({ ...emptyForm, broker_producer: broker, client_name: client });
      setSubmitError(null);
      setAttemptedSubmit(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const clientOptionsForBroker = Array.from(new Set(
    [
      ...(brokerClientOptions.find((o) => o.broker === form.broker_producer)?.clients ?? [defaultClientName]),
      form.client_name,
    ].filter(Boolean),
  ));

  const setField = (name: keyof typeof form, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'broker_producer') {
        const clients = brokerClientOptions.find((o) => o.broker === value)?.clients ?? [defaultClientName];
        if (!clients.includes(prev.client_name)) next.client_name = clients[0] ?? '';
      }
      return next;
    });
  };

  const requiredFieldChecks: [string, boolean][] = [
    ['Broker / Producer', form.broker_producer.trim() !== ''],
    ['Client Name', form.client_name.trim() !== ''],
    ['Policy Number', form.policy_number.trim() !== ''],
    ['Effective Date', form.effective_date !== ''],
    ['End Date', form.end_date !== ''],
  ];
  const missingFields = requiredFieldChecks.filter(([, ok]) => !ok).map(([label]) => label);
  const isValid = missingFields.length === 0;
  const fieldError = (label: string) => (attemptedSubmit && missingFields.includes(label) ? 'Required' : undefined);

  const handleSubmit = async () => {
    if (!isValid || saving) {
      if (!isValid) setAttemptedSubmit(true);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      const payload: CreatePolicyPayload = {
        broker_producer: form.broker_producer.trim(),
        client_name: form.client_name.trim(),
        policy_number: form.policy_number.trim(),
        product_line: form.product_line || null,
        effective_date: form.effective_date,
        end_date: form.end_date,
        status: form.status,
      };
      const created = await createPolicy(contractId, payload);
      onCreated(created.policy_number);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create policy';
      setSubmitError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Add Policy" width="w-[460px]">
      <div className="flex flex-col gap-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Broker / Producer" error={fieldError('Broker / Producer')}>
            <select
              value={form.broker_producer}
              onChange={(e) => setField('broker_producer', e.target.value)}
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 ${fieldError('Broker / Producer') ? 'border-red-400' : 'border-gray-300'}`}
            >
              {brokerClientOptions.map((o) => (
                <option key={o.broker} value={o.broker}>{o.broker || 'Unknown'}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Client Name" error={fieldError('Client Name')}>
            <select
              value={form.client_name}
              onChange={(e) => setField('client_name', e.target.value)}
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 ${fieldError('Client Name') ? 'border-red-400' : 'border-gray-300'}`}
            >
              {clientOptionsForBroker.map((c) => (
                <option key={c} value={c}>{c || 'Unknown'}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Policy Number" error={fieldError('Policy Number')}>
            <input
              type="text"
              value={form.policy_number}
              onChange={(e) => setField('policy_number', e.target.value.toUpperCase())}
              placeholder="e.g. FLK0980306"
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] font-mono text-gray-800 outline-none focus:border-navy-700 ${fieldError('Policy Number') ? 'border-red-400' : 'border-gray-300'}`}
            />
          </FormField>
          <FormField label="Product Line">
            <select
              value={form.product_line}
              onChange={(e) => setField('product_line', e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700"
            >
              <option value="">Select…</option>
              {PRODUCT_LINE_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Effective Date" error={fieldError('Effective Date')}>
            <input
              type="date"
              value={form.effective_date}
              onChange={(e) => setField('effective_date', e.target.value)}
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 ${fieldError('Effective Date') ? 'border-red-400' : 'border-gray-300'}`}
            />
          </FormField>
          <FormField label="End Date" error={fieldError('End Date')}>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setField('end_date', e.target.value)}
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 ${fieldError('End Date') ? 'border-red-400' : 'border-gray-300'}`}
            />
          </FormField>
          <FormField label="Status">
            <select
              value={form.status}
              onChange={(e) => setField('status', e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </FormField>
        </div>

        {submitError && (
          <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-[12px] text-red-900">
            <span className="font-semibold">Could not create policy: </span>
            {submitError}
          </div>
        )}

        <div className="mt-2 flex items-center justify-end gap-2 border-t border-gray-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            title={!isValid ? `Missing: ${missingFields.join(', ')}` : undefined}
            className="inline-flex items-center gap-1.5 rounded bg-navy-700 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SaveIcon className="h-3.5 w-3.5" />
            {saving ? 'Creating…' : 'Create Policy'}
          </button>
        </div>
      </div>
    </Drawer>
  );
}

const PG_CATEGORY_OPTIONS = ['AVAILABILITY', 'FINANCIAL_ACCURACY', 'CLAIMS_PROCESSING', 'CUSTOMER_SERVICE', 'TIMELINESS', 'ACCURACY', 'QUALITY', 'OTHER'];
// Confirmed via backend PGCreate validation error response (not guessed):
const THRESHOLD_UNIT_OPTIONS = ['PERCENTAGE', 'DAYS_CALENDAR', 'DAYS_BUSINESS', 'SECONDS', 'SCORE', 'DOLLAR', 'COUNTS', 'OTHER'];
const THRESHOLD_DIRECTION_OPTIONS = ['MINIMUM', 'MAXIMUM', 'EXACT', 'RANGE'];
const BASIS_OF_MEASUREMENT_OPTIONS = ['CLIENT_SPECIFIC', 'BOOK_OF_BUSINESS', 'CENTER_LEVEL', 'ENHANCED_NETWORK', 'INTERNAL_REVIEW', 'WORKFLOW_TOOL', 'STANDARD_SURVEY', 'OTHER'];
const EVALUATION_PERIOD_OPTIONS = ['MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME', 'OTHER'];
const PENALTY_TYPE_OPTIONS = ['PERCENTAGE_OF_POOL', 'FLAT_DOLLAR', 'CREDIT', 'EARNBACK', 'HYBRID', 'PRODUCT_BASED', 'COMPONENT_WEIGHTED'];
const CLASSIFICATION_OPTIONS = ['STANDARD', 'NON_STANDARD', 'CUSTOM_NEW'];

function AddPGDialog({
  open,
  onClose,
  contractId,
  policyOptions,
  brokerClientOptions,
  defaultBroker,
  defaultClientName,
  onCreated,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  contractId: string;
  policyOptions: { policy_number: string; product_line: string | null }[];
  brokerClientOptions: { broker: string; clients: string[] }[];
  defaultBroker: string;
  defaultClientName: string;
  onCreated: (policyNumber: string, pgId: string) => void;
  onError: (message: string) => void;
}) {
  // The contract's own broker/client can be blank/null; fall back to the first
  // known broker/client pair so the select never sits on an unmatched value.
  const resolveDefaults = () => {
    const broker = defaultBroker || brokerClientOptions[0]?.broker || '';
    const clients = brokerClientOptions.find((o) => o.broker === broker)?.clients ?? [];
    const client = defaultClientName && clients.includes(defaultClientName) ? defaultClientName : (clients[0] ?? defaultClientName ?? '');
    return { broker, client };
  };

  const emptyForm = {
    broker_producer: resolveDefaults().broker,
    client_name: resolveDefaults().client,
    policy_number: '',
    pg_category: '',
    pg_sub_category: '',
    pg_metric_name: '',
    department: '',
    operational_area: '',
    product_line: '' as string,
    performance_standard_text: '',
    threshold_value: '',
    threshold_unit: '',
    threshold_direction: '',
    threshold_qualifier: '',
    basis_of_measurement: '',
    evaluation_method_text: '',
    evaluation_period: '',
    reporting_cadence: '',
    penalty_cadence: '',
    penalty_type: '',
    penalty_allocation_percentage: '',
    penalty_dollar_amount: '',
    metric_owner: '',
    source_system: '',
    results_source: '',
    classification: '',
    classification_reason: '',
    notes: '',
    deviation_details: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [validation, setValidation] = useState<PGValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [creating, setCreating] = useState(false);
  // Request-level failure (network error, 4xx/5xx from the API) — kept separate from
  // `validation` (the structured pass/fail result the backend returns on a 200) so it
  // stays visible in the dialog instead of just flashing a toast.
  const [requestError, setRequestError] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  useEffect(() => {
    if (open) {
      const { broker, client } = resolveDefaults();
      setForm({
        ...emptyForm,
        broker_producer: broker,
        client_name: client,
        policy_number: policyOptions[0]?.policy_number ?? '',
      });
      setValidation(null);
      setRequestError(null);
      setAttemptedSubmit(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const clientOptionsForBroker = Array.from(new Set(
    [
      ...(brokerClientOptions.find((o) => o.broker === form.broker_producer)?.clients ?? [defaultClientName]),
      form.client_name,
    ].filter(Boolean),
  ));

  const productLineOptions = Array.from(
    new Set([
      ...policyOptions.map((p) => p.product_line).filter((p): p is string => !!p),
      ...PRODUCT_LINE_OPTIONS,
    ]),
  );

  const setField = (name: keyof typeof form, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'broker_producer') {
        const clients = brokerClientOptions.find((o) => o.broker === value)?.clients ?? [defaultClientName];
        if (!clients.includes(prev.client_name)) next.client_name = clients[0] ?? '';
      }
      if (name === 'policy_number') {
        const matched = policyOptions.find((p) => p.policy_number === value);
        if (matched?.product_line) next.product_line = matched.product_line;
      }
      return next;
    });
    setValidation(null);
    setRequestError(null);
  };

  // threshold_unit, basis_of_measurement, evaluation_period, evaluation_method_text and
  // penalty_type are all confirmed required (non-nullable) by the backend's PGCreate model —
  // each has shown up by name in its 422 validation errors — so all are gated here.
  const requiredFieldChecks: [string, boolean][] = [
    ['Broker / Producer', form.broker_producer.trim() !== ''],
    ['Client Name', form.client_name.trim() !== ''],
    ['Policy Number', form.policy_number.trim() !== ''],
    ['PG Category', form.pg_category.trim() !== ''],
    ['PG Sub-Category', form.pg_sub_category.trim() !== ''],
    ['PG Metric Name', form.pg_metric_name.trim() !== ''],
    ['Product Line', form.product_line.trim() !== ''],
    ['Performance Standard Text', form.performance_standard_text.trim() !== ''],
    ['Threshold Unit', form.threshold_unit !== ''],
    ['Threshold Direction', form.threshold_direction !== ''],
    ['Basis of Measurement', form.basis_of_measurement !== ''],
    ['Evaluation Period', form.evaluation_period !== ''],
    ['Evaluation Method Text', form.evaluation_method_text.trim() !== ''],
    ['Penalty Type', form.penalty_type !== ''],
    ['Classification', form.classification !== ''],
  ];
  const missingFields = requiredFieldChecks.filter(([, ok]) => !ok).map(([label]) => label);
  const hasRequiredFields = missingFields.length === 0;
  const fieldError = (label: string) => (attemptedSubmit && missingFields.includes(label) ? 'Required' : undefined);

  const buildPayload = (): ManualPGPayload => ({
    broker_producer: form.broker_producer,
    client_name: form.client_name,
    pg_category: form.pg_category,
    pg_sub_category: form.pg_sub_category,
    product_line: form.product_line ? [form.product_line] : [],
    performance_standard_text: form.performance_standard_text,
    threshold_value: form.threshold_value === '' ? null : Number(form.threshold_value),
    threshold_unit: form.threshold_unit || null,
    threshold_direction: form.threshold_direction || null,
    threshold_qualifier: form.threshold_qualifier || null,
    basis_of_measurement: form.basis_of_measurement || null,
    evaluation_method_text: form.evaluation_method_text || null,
    evaluation_period: form.evaluation_period || null,
    reporting_cadence: form.reporting_cadence || null,
    penalty_cadence: form.penalty_cadence || null,
    penalty_allocation_percentage: form.penalty_allocation_percentage === '' ? null : Number(form.penalty_allocation_percentage),
    penalty_type: form.penalty_type || null,
    penalty_dollar_amount: form.penalty_dollar_amount === '' ? null : Number(form.penalty_dollar_amount),
    penalty_tier_structure: null,
    minimum_volume_threshold: null,
    minimum_volume_fallback: null,
    volume_threshold_type: null,
    volume_comparison_operator: null,
    volume_exception_notes: null,
    pg_metric_name: form.pg_metric_name,
    department: form.department || null,
    operational_area: form.operational_area || null,
    metric_owner: form.metric_owner || null,
    source_system: form.source_system || null,
    results_source: form.results_source || null,
    metric_amount_at_risk: null,
    third_party_references: [],
    amendment_flag: false,
    notes: form.notes || null,
    policy_number: form.policy_number,
    classification: form.classification,
    classification_reason: form.classification_reason || null,
    deviation_details: form.deviation_details || null,
  });

  const handleValidate = async () => {
    if (validating) return;
    if (!hasRequiredFields) {
      setAttemptedSubmit(true);
      return;
    }
    setValidating(true);
    setValidation(null);
    setRequestError(null);
    try {
      const result = await validatePG(contractId, buildPayload());
      setValidation(result);
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Could not reach the server. Check your connection and try again.');
    } finally {
      setValidating(false);
    }
  };

  const handleCreate = async () => {
    if (!validation?.valid || creating) return;
    setCreating(true);
    setRequestError(null);
    try {
      const created = await createPG(contractId, buildPayload());
      onCreated(form.policy_number, created.pg_id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create PG. Please try again.';
      setRequestError(message);
      onError(message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Add Performance Guarantee" width="w-[640px]">
      <div className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Broker / Producer" error={fieldError('Broker / Producer')}>
            <select
              value={form.broker_producer}
              onChange={(e) => setField('broker_producer', e.target.value)}
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 ${fieldError('Broker / Producer') ? 'border-red-400' : 'border-gray-300'}`}
            >
              {brokerClientOptions.map((o) => (
                <option key={o.broker} value={o.broker}>{o.broker || 'Unknown'}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Client Name" error={fieldError('Client Name')}>
            <select
              value={form.client_name}
              onChange={(e) => setField('client_name', e.target.value)}
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 ${fieldError('Client Name') ? 'border-red-400' : 'border-gray-300'}`}
            >
              {clientOptionsForBroker.map((c) => (
                <option key={c} value={c}>{c || 'Unknown'}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Policy Number" error={fieldError('Policy Number')}>
            <select
              value={form.policy_number}
              onChange={(e) => setField('policy_number', e.target.value)}
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] font-mono text-gray-800 outline-none focus:border-navy-700 ${fieldError('Policy Number') ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">Select…</option>
              {policyOptions.map((p) => (
                <option key={p.policy_number} value={p.policy_number}>{p.policy_number}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Product Line" error={fieldError('Product Line')}>
            <select
              value={form.product_line}
              onChange={(e) => setField('product_line', e.target.value)}
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 ${fieldError('Product Line') ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">Select…</option>
              {productLineOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </FormField>
          <FormField label="PG Category" error={fieldError('PG Category')}>
            <select
              value={form.pg_category}
              onChange={(e) => setField('pg_category', e.target.value)}
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 ${fieldError('PG Category') ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">Select…</option>
              {PG_CATEGORY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </FormField>
          <FormField label="PG Sub-Category" error={fieldError('PG Sub-Category')}>
            <input
              type="text"
              value={form.pg_sub_category}
              onChange={(e) => setField('pg_sub_category', e.target.value)}
              placeholder="e.g. Service Uptime"
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 ${fieldError('PG Sub-Category') ? 'border-red-400' : 'border-gray-300'}`}
            />
          </FormField>
          <FormField label="PG Metric Name" error={fieldError('PG Metric Name')}>
            <input
              type="text"
              value={form.pg_metric_name}
              onChange={(e) => setField('pg_metric_name', e.target.value)}
              placeholder="e.g. Service Uptime Percentage"
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 ${fieldError('PG Metric Name') ? 'border-red-400' : 'border-gray-300'}`}
            />
          </FormField>

          <FormField label="Performance Standard Text" className="col-span-2" error={fieldError('Performance Standard Text')}>
            <textarea
              rows={2}
              value={form.performance_standard_text}
              onChange={(e) => setField('performance_standard_text', e.target.value)}
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 resize-y ${fieldError('Performance Standard Text') ? 'border-red-400' : 'border-gray-300'}`}
            />
          </FormField>

          <FormField label="Threshold Direction" error={fieldError('Threshold Direction')}>
            <select
              value={form.threshold_direction}
              onChange={(e) => setField('threshold_direction', e.target.value)}
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 ${fieldError('Threshold Direction') ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">Select…</option>
              {THRESHOLD_DIRECTION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </FormField>
          <FormField label="Threshold Value">
            <input
              type="number"
              step="0.01"
              value={form.threshold_value}
              onChange={(e) => setField('threshold_value', e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700"
            />
          </FormField>
          <FormField label="Threshold Unit" error={fieldError('Threshold Unit')}>
            <select
              value={form.threshold_unit}
              onChange={(e) => setField('threshold_unit', e.target.value)}
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 ${fieldError('Threshold Unit') ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">Select…</option>
              {THRESHOLD_UNIT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </FormField>
          <FormField label="Basis of Measurement" error={fieldError('Basis of Measurement')}>
            <select
              value={form.basis_of_measurement}
              onChange={(e) => setField('basis_of_measurement', e.target.value)}
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 ${fieldError('Basis of Measurement') ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">Select…</option>
              {BASIS_OF_MEASUREMENT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </FormField>
          <FormField label="Evaluation Period" error={fieldError('Evaluation Period')}>
            <select
              value={form.evaluation_period}
              onChange={(e) => setField('evaluation_period', e.target.value)}
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 ${fieldError('Evaluation Period') ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">Select…</option>
              {EVALUATION_PERIOD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </FormField>
          <FormField label="Penalty Type" error={fieldError('Penalty Type')}>
            <select
              value={form.penalty_type}
              onChange={(e) => setField('penalty_type', e.target.value)}
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 ${fieldError('Penalty Type') ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">Select…</option>
              {PENALTY_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </FormField>
          <FormField label="Penalty Allocation %">
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.penalty_allocation_percentage}
              onChange={(e) => setField('penalty_allocation_percentage', e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700"
            />
          </FormField>

          <FormField label="Evaluation Method Text" className="col-span-2" error={fieldError('Evaluation Method Text')}>
            <textarea
              rows={2}
              value={form.evaluation_method_text}
              onChange={(e) => setField('evaluation_method_text', e.target.value)}
              placeholder="e.g. Measured monthly using infrastructure monitoring reports."
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 resize-y ${fieldError('Evaluation Method Text') ? 'border-red-400' : 'border-gray-300'}`}
            />
          </FormField>

          <FormField label="Classification" error={fieldError('Classification')}>
            <select
              value={form.classification}
              onChange={(e) => setField('classification', e.target.value)}
              className={`w-full rounded border bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 ${fieldError('Classification') ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">Select…</option>
              {CLASSIFICATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </FormField>
          <FormField label="Classification Reason" className="col-span-2">
            <input
              type="text"
              value={form.classification_reason}
              onChange={(e) => setField('classification_reason', e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700"
            />
          </FormField>

          <FormField label="Notes" className="col-span-2">
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Manual PG created through UI"
              className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-[12.5px] text-gray-800 outline-none focus:border-navy-700 resize-y"
            />
          </FormField>
        </div>

        {requestError && (
          <div className="flex items-start gap-2 rounded border border-red-300 bg-red-50 px-3 py-2.5">
            <XCircleIcon className="h-4 w-4 mt-0.5 shrink-0 text-red-700" />
            <div>
              <div className="text-[12.5px] font-semibold text-red-800">Couldn't validate this PG</div>
              <div className="mt-0.5 text-[12px] text-red-800 leading-relaxed">{requestError}</div>
            </div>
          </div>
        )}

        {validation && (
          <div className={`rounded border px-3 py-2.5 ${validation.valid ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
            <div className={`flex items-center gap-1.5 text-[12.5px] font-semibold ${validation.valid ? 'text-green-800' : 'text-red-800'}`}>
              {validation.valid ? <ShieldCheckIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
              {validation.valid ? 'Validation passed' : 'Validation failed'}
            </div>
            {validation.errors.length > 0 && (
              <ul className="mt-1.5 list-disc pl-5 text-[12px] text-red-800">
                {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            {validation.warnings.length > 0 && (
              <ul className="mt-1.5 list-disc pl-5 text-[12px] text-amber-800">
                {validation.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleValidate}
            disabled={validating}
            title={!hasRequiredFields ? `Missing: ${missingFields.join(', ')}` : undefined}
            className="inline-flex items-center gap-1.5 rounded border border-navy-700 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-navy-700 transition-colors hover:bg-navy-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShieldCheckIcon className="h-3.5 w-3.5" />
            {validating ? 'Validating…' : 'Validate'}
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!validation?.valid || creating}
            title={!validation?.valid ? 'Run Validate successfully before creating' : undefined}
            className="inline-flex items-center gap-1.5 rounded bg-navy-700 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SaveIcon className="h-3.5 w-3.5" />
            {creating ? 'Creating…' : 'Create PG'}
          </button>
        </div>
      </div>
    </Drawer>
  );
}
