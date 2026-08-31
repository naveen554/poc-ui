import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRightIcon, ChevronDownIcon, CheckCircle2Icon, XCircleIcon, AlertCircleIcon, InfoIcon, EyeIcon, RefreshCwIcon, DownloadIcon, RotateCcwIcon, SaveIcon, FileTextIcon, BriefcaseIcon, Building2Icon, UploadCloudIcon, PhoneCallIcon, ClipboardListIcon, LinkIcon } from 'lucide-react';
import { getContractDetails, getContractPipelineStatus, constructS3DocumentUrl, getPGsByContract, listPoliciesForContract, getPGsByPolicy, updatePG, UpdatePGPayload, PerformanceGuarantee, PolicySummary, PGValidation, ContractValidation, ExtractionException, getContractHierarchy, ContractHierarchyResponse } from '../services/api';
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
          // Fetch hierarchy data
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
          // Refresh hierarchy data
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

  if (loading) {
    return <Loader />;
  }

  if (error || !contract) {
    return (
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-4">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">{error || 'Contract not found'}</p>
          <button
            onClick={() => navigate('/contracts')}
            className="mt-2 text-sm font-semibold text-red-900 underline"
          >
            Back to Contracts
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

  const pgCounts = {
    all: totalPgs,
    standard: pgs.filter(pg => isStandard(pg.classification)).length,
    nonStandard: pgs.filter(pg => isNonStandard(pg.classification)).length,
    custom: pgs.filter(pg => isCustom(pg.classification)).length,
  };

  const filteredPgs = pgs.filter(pg => {
    if (pgTab === 'all') return true;
    if (pgTab === 'standard') return isStandard(pg.classification);
    if (pgTab === 'nonStandard') return isNonStandard(pg.classification);
    if (pgTab === 'custom') return isCustom(pg.classification);
    return false;
  });

  const policyList = policySummaries.length > 0
    ? policySummaries.map((p) => p.policy_number)
    : (contract.policy_numbers && contract.policy_numbers.length > 0
      ? contract.policy_numbers
      : ['(No Policy Number)']);

  const policySections = policyList.map((policyNumber) => {
    const policyPgs = pgsByPolicy[policyNumber] ?? [];
    const scopedFiltered = policyPgs.filter((pg) => {
      if (pgTab === 'all') return true;
      if (pgTab === 'standard') return isStandard(pg.classification);
      if (pgTab === 'nonStandard') return isNonStandard(pg.classification);
      if (pgTab === 'custom') return isCustom(pg.classification);
      return false;
    });
    const categories = scopedFiltered.reduce<Record<string, PerformanceGuarantee[]>>((acc, pg) => {
      const key = pg.pg_category || 'Uncategorized';
      if (!acc[key]) acc[key] = [];
      acc[key].push(pg);
      return acc;
    }, {});
    const summary = policySummaries.find((p) => p.policy_number === policyNumber);
    return {
      key: policyNumber,
      label: policyNumber,
      pgs: scopedFiltered,
      categories,
      summary,
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-4">
      <nav className="flex items-center gap-1 text-sm text-gray-600">
        <button
          onClick={() => navigate('/contracts')}
          className="hover:text-navy-700 transition-colors"
        >
          Contracts
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

      <div className="flex items-center gap-1 border-b border-gray-200">
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
            <div className="rounded-md border border-gray-200 bg-white shadow-sm">
              <div className="flex h-9 items-center justify-between bg-navy-700 px-3 text-white">
                <h2 className="text-[13px] font-semibold">Contract Validations ({contract.contract_validations.length})</h2>
                <div className="flex items-center gap-2 text-[11px]">
                  {contract.contract_validation_failures > 0 && (
                    <span className="rounded bg-red-600 px-1.5 py-0.5 font-bold">{contract.contract_validation_failures} Failed</span>
                  )}
                  {contract.contract_validation_warnings > 0 && (
                    <span className="rounded bg-amber-500 px-1.5 py-0.5 font-bold">{contract.contract_validation_warnings} Warnings</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 p-4">
                {contract.contract_validations.map((v, i) => (
                  <ValidationCard key={`${v.rule_id}-${i}`} validation={v} />
                ))}
              </div>
            </div>
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

          <div className="flex items-center gap-2 px-1 py-1">
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
                            const policyNumbers = contractItem.policy_numbers || [];
                            
                            return (
                              <div key={contractIdx} className="bg-gray-50/60 px-5 py-4 border-t border-gray-200">
                                <div className="mb-3 flex items-center gap-2 text-[12px] text-gray-600">
                                  <ClipboardListIcon className="h-4 w-4" />
                                  <span className="font-semibold">Policies ({policyNumbers.length})</span>
                                  <span className="ml-auto text-[11px]">
                                    <span className="text-gray-600 font-semibold">{contractItem.total_pgs} Total PGs</span>
                                    {' • '}
                                    <span className="text-green-700 font-semibold">{contractItem.standard_count} Standard</span>
                                    {' • '}
                                    <span className="text-amber-700 font-semibold">{contractItem.non_standard_count} Non-Standard</span>
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
                                    
                                    const categories = scopedFiltered.reduce<Record<string, PerformanceGuarantee[]>>((acc, pg) => {
                                      const key = pg.pg_category || 'Uncategorized';
                                      if (!acc[key]) acc[key] = [];
                                      acc[key].push(pg);
                                      return acc;
                                    }, {});
                                    
                                    const summary = policySummaries.find((p) => p.policy_number === policyNumber);
                                    const summaryTotal = summary?.total_pgs ?? summary?.pg_count ?? scopedFiltered.length;
                                    
                                    return (
                                      <div key={policyKey} className="rounded-md border border-gray-300 bg-white shadow-sm overflow-hidden">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            toggleSection(policyKey);
                                            ensurePolicyPGsLoaded(policyNumber);
                                          }}
                                          className="w-full flex items-center gap-3 bg-navy-600 px-4 py-2.5 text-left text-white transition-colors hover:bg-navy-700"
                                        >
                                          <ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform ${isPolicyOpen ? '' : '-rotate-90'}`} />
                                          <FileTextIcon className="h-4 w-4 shrink-0" />
                                          <div className="flex flex-col leading-tight min-w-0">
                                            <span className="text-[10px] uppercase tracking-wide text-white/70">Policy Number</span>
                                            <span className="text-[13px] font-mono font-semibold truncate">{policyNumber}</span>
                                          </div>
                                          <span className="ml-auto inline-flex items-center gap-2">
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
                                          </span>
                                        </button>
                                        
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
                                              Object.entries(categories).map(([category, list]) => {
                                                const catKey = `${policyKey}:cat:${category}`;
                                                const catOpen = openSections[catKey] ?? true;
                                                return (
                                                  <div key={category} className="rounded border border-gray-200 bg-white overflow-hidden">
                                                    <button
                                                      type="button"
                                                      onClick={() => toggleSection(catKey)}
                                                      className="w-full flex items-center gap-2 bg-navy-50 px-3 py-2 text-left transition-colors hover:bg-navy-100"
                                                    >
                                                      <ChevronDownIcon className={`h-3.5 w-3.5 shrink-0 text-navy-700 transition-transform ${catOpen ? '' : '-rotate-90'}`} />
                                                      <span className="text-[12px] font-semibold text-navy-800 truncate">{category}</span>
                                                      <span className="ml-auto rounded bg-white border border-navy-200 px-1.5 py-0.5 text-[10px] font-semibold text-navy-700">
                                                        {list.length}
                                                      </span>
                                                    </button>
                                                    {catOpen && (
                                                      <div className="flex flex-col gap-3 p-3">
                                                        {list.map((pg) => (
                                                          <PGEditor
                                                            key={pg.pg_record_id}
                                                            pg={pg}
                                                            onSave={(payload) => handleSavePG(pg, payload)}
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
                    <button
                      type="button"
                      onClick={() => handleTogglePolicy(section.key)}
                      className="w-full flex items-center gap-3 bg-navy-700 px-4 py-2.5 text-left text-white transition-colors hover:bg-navy-800"
                    >
                      <ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                      <FileTextIcon className="h-4 w-4 shrink-0" />
                      <div className="flex flex-col leading-tight min-w-0">
                        <span className="text-[10px] uppercase tracking-wide text-white/70">Policy</span>
                        <span className="text-[13px] font-mono font-semibold truncate">{section.label}</span>
                      </div>
                      <span className="ml-auto inline-flex items-center gap-2">
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
                      </span>
                    </button>
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
                          Object.entries(section.categories).map(([category, list]) => {
                            const catKey = `policy:${section.key}:cat:${category}`;
                            const catOpen = openSections[catKey] ?? true;
                            return (
                              <div key={category} className="rounded border border-gray-200 bg-white overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => toggleSection(catKey)}
                                  className="w-full flex items-center gap-2 bg-navy-50 px-3 py-2 text-left transition-colors hover:bg-navy-100"
                                >
                                  <ChevronDownIcon className={`h-3.5 w-3.5 shrink-0 text-navy-700 transition-transform ${catOpen ? '' : '-rotate-90'}`} />
                                  <span className="text-[12px] font-semibold text-navy-800 truncate">{category}</span>
                                  <span className="ml-auto rounded bg-white border border-navy-200 px-1.5 py-0.5 text-[10px] font-semibold text-navy-700">
                                    {list.length}
                                  </span>
                                </button>
                                {catOpen && (
                                  <div className="flex flex-col gap-3 p-3">
                                    {list.map((pg) => (
                                      <PGEditor
                                        key={pg.pg_record_id}
                                        pg={pg}
                                        onSave={(payload) => handleSavePG(pg, payload)}
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
    </div>
  );
}

function PGEditor({
  pg,
  onSave,
  isStandard,
  isNonStandard,
  isCustom,
  showValidations,
}: {
  pg: PerformanceGuarantee;
  onSave: (payload: UpdatePGPayload) => Promise<PerformanceGuarantee | null>;
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

  const handleSave = async () => {
    setSaving(true);
    const payload: UpdatePGPayload = {
      threshold_value: form.threshold_value === '' ? null : isNaN(Number(form.threshold_value)) ? String(form.threshold_value) : Number(form.threshold_value),
      threshold_unit: form.threshold_unit || null,
      basis_of_measurement: form.basis_of_measurement || null,
      notes: form.notes || null,
      penalty_allocation_percentage: form.penalty_allocation_percentage === '' ? null : Number(form.penalty_allocation_percentage),
      classification: form.classification || null,
      classification_reason: form.classification_reason || null,
      comments: form.comments || null,
    };
    const updated = await onSave(payload);
    if (updated) {
      const next = buildInitial(updated);
      setOriginal(next);
      setForm(next);
    }
    setSaving(false);
  };

  const classificationValue = String(form.classification || '').toUpperCase();
  const classificationTone =
    isStandard(classificationValue) ? 'text-green-700 bg-green-50 border-green-200' :
    isNonStandard(classificationValue) ? 'text-amber-700 bg-amber-50 border-amber-200' :
    isCustom(classificationValue) ? 'text-red-700 bg-red-50 border-red-200' :
    'text-gray-700 bg-gray-50 border-gray-200';

  const productDisplay = pg.product_line?.length > 0 ? pg.product_line.join(', ') : '—';
  const confidenceValue = parseFloat(pg.confidence_score || '0');
  const reviewStatus = pg.review_status === 'PENDING_REVIEW' ? 'Pending' : pg.review_status || '—';
  const statusColor =
    pg.review_status === 'APPROVED' ? 'text-green-700 bg-green-50 border-green-200' :
    pg.review_status === 'REJECTED' ? 'text-red-700 bg-red-50 border-red-200' :
    'text-amber-700 bg-amber-50 border-amber-200';

  return (
    <div className={`rounded-md border ${isDirty ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200'} bg-white shadow-sm overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
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
            <span>Product: <span className="font-medium text-gray-700">{productDisplay}</span></span>
            <span>Confidence: <span className="font-semibold text-gray-700">{confidenceValue ? confidenceValue.toFixed(2) : '—'}</span></span>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${classificationTone}`}>
          {classificationValue || 'UNCLASSIFIED'}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusColor}`}>
          {reviewStatus}
        </span>
      </button>

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
              disabled={!isDirty || saving}
              className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcwIcon className="h-3.5 w-3.5" />
              Revert to Original
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="inline-flex items-center gap-1.5 rounded bg-navy-700 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SaveIcon className="h-3.5 w-3.5" />
              {saving ? 'Saving…' : 'Save Changes'}
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

function FormField({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
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
