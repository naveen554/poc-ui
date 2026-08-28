import { useEffect, useState, Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRightIcon, ChevronDownIcon, CheckCircle2Icon, XCircleIcon, AlertCircleIcon, HistoryIcon, InfoIcon, EyeIcon, RefreshCwIcon, DownloadIcon } from 'lucide-react';
import { getContractDetails, getContractPipelineStatus, constructS3DocumentUrl, getPGsByContract, getPGDetail, getPGHistory, PerformanceGuarantee, PGHistoryItem, PGValidation, ContractValidation, ExtractionException } from '../services/api';
import { ContractDetails } from '../services/api';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Loader } from '../components/ui/Loader';
import { Dialog } from '../components/ui/Dialog';
import { PGHistory } from '../components/ui/PGHistory';
import { mapStatusToFileStatus } from '../services/mappers';
import { getFeatureFlag, FeatureFlagKeys } from '../config/launchdarkly';

type MainTabKey = 'contract' | 'pgs';

type PGTabKey = 'all' | 'standard' | 'nonStandard' | 'custom';

const pgTabs: {key: PGTabKey; label: string}[] = [
  { key: 'all', label: 'All' },
  { key: 'standard', label: 'Standard' },
  { key: 'nonStandard', label: 'Non-Standard' },
  { key: 'custom', label: 'Custom' }
];

export function ContractDetailsPage() {
  const { fileId = '' } = useParams();
  const navigate = useNavigate();
  
  const [contract, setContract] = useState<ContractDetails | null>(null);
  const [pgs, setPgs] = useState<PerformanceGuarantee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<string>('');
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [mainTab, setMainTab] = useState<MainTabKey>('contract');
  const [pgTab, setPgTab] = useState<PGTabKey>('all');
  const [expandedPGId, setExpandedPGId] = useState<string | null>(null);
  const [pgDetail, setPgDetail] = useState<PerformanceGuarantee | null>(null);
  const [pgDetailLoading, setPgDetailLoading] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<PGHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPGId, setHistoryPGId] = useState<string>('');
  const showPerformanceGuarantees = getFeatureFlag(FeatureFlagKeys.PERFORMANCE_GUARANTEE);
  const showReviewProgress = getFeatureFlag(FeatureFlagKeys.REVIEW_PROGRESS);

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
          const pgsData = await getPGsByContract(fileId);
          setPgs(pgsData);
        } catch (err) {
          console.error('Failed to load PGs:', err);
          setPgs([]);
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
          const pgsData = await getPGsByContract(fileId);
          setPgs(pgsData);
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

  const handleTogglePG = async (pg: PerformanceGuarantee) => {
    if (expandedPGId === pg.pg_record_id) {
      setExpandedPGId(null);
      setPgDetail(null);
      return;
    }
    setExpandedPGId(pg.pg_record_id);
    setPgDetail(null);
    setPgDetailLoading(true);
    try {
      const detail = await getPGDetail(fileId, pg.pg_id);
      setPgDetail(detail);
    } catch (err) {
      console.error('Failed to load PG detail:', err);
      setPgDetail(pg);
    } finally {
      setPgDetailLoading(false);
    }
  };

  const handleOpenHistory = async (pg: PerformanceGuarantee, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistoryPGId(pg.pg_id);
    setHistoryDrawerOpen(true);
    setHistoryLoading(true);
    setHistoryItems([]);
    try {
      const items = await getPGHistory(fileId, pg.pg_id);
      setHistoryItems(items);
    } catch (err) {
      console.error('Failed to load PG history:', err);
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
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
              <InfoField label="Client Name" value={contract.client_name} />
              <InfoField label="Salesforce Client Name" value={contract.salesforce_client_name} />
              <InfoField label="Client Account #" value={contract.client_account_number} />
              <InfoField label="Contract Date" value={contract.contract_date} />
              <InfoField label="Agreement Type" value={contract.agreement_period_type} />
              <InfoField label="Agreement Start" value={contract.agreement_period_start} />
              <InfoField label="Agreement End" value={contract.agreement_period_end} />
              <InfoField label="Renewal Date" value={contract.renewal_date} />
              <InfoField label="Cancellation Date" value={contract.cancellation_date} />
              <InfoField label="NYL Representative" value={contract.nyl_representative_name} />
              <InfoField label="Broker / Producer" value={contract.broker_producer} />
              <InfoField label="Account Manager" value={contract.account_manager} />
              <InfoField label="Total Amount at Risk" value={contract.total_amount_at_risk_desc} />
              <InfoField label="Amount at Risk Type" value={contract.total_amount_at_risk_type} />
              <InfoField label="Premium Percentage" value={contract.premium_percentage ? `${contract.premium_percentage}%` : null} />
              <InfoField label="Admin Fee Percentage" value={contract.admin_fee_percentage ? `${contract.admin_fee_percentage}%` : null} />
              <InfoField label="Dollar Cap" value={contract.dollar_cap ? `$${parseFloat(contract.dollar_cap).toLocaleString()}` : null} />
              <InfoField label="Implementation Amount at Risk" value={contract.implementation_amount_at_risk ? `$${parseFloat(contract.implementation_amount_at_risk).toLocaleString()}` : null} />
              <InfoField label="Penalty Basis" value={contract.penalty_basis} />
              <InfoField label="Signature Status" value={contract.signature_status} />
              <InfoField label="Signature Date" value={contract.signature_date} />
              <InfoField label="Off-Cycle" value={contract.off_cycle_flag ? 'Yes' : 'No'} />
              <InfoField label="WTW Indicator" value={contract.wtw_indicator ? 'Yes' : 'No'} />
              <InfoField label="AON Indicator" value={contract.aon_indicator ? 'Yes' : 'No'} />
              <InfoField label="Total Pages" value={contract.contract_pages_total?.toString()} />
              <InfoField label="Total PGs" value={contract.total_pgs?.toString()} />
              <InfoField label="Standard Count" value={contract.standard_count?.toString()} />
              <InfoField label="Non-Standard Count" value={contract.non_standard_count?.toString()} />
              <InfoField label="Human Review Count" value={contract.human_review_count?.toString()} />
              <InfoField label="Validation Failures" value={contract.contract_validation_failures?.toString()} />
              <InfoField label="Validation Warnings" value={contract.contract_validation_warnings?.toString()} />
              <InfoField label="Policy Numbers" value={contract.policy_numbers?.join(', ')} />
              <InfoField label="Uploaded By" value={contract.uploaded_by} />
              <InfoField label="Last Reviewed By" value={contract.last_reviewed_by} />
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

          {contract.extraction_exceptions && contract.extraction_exceptions.length > 0 && (
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

          <div className="rounded-md border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
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
                    className={`rounded border px-3 py-1.5 text-[13px] font-medium transition-all duration-150 ${colorClasses}`}
                  >
                    {tab.label} <span className="font-semibold">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left table-fixed">
                <thead>
                  <tr className="bg-navy-700 text-white">
                    <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide w-[36px]"></th>
                    <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide w-[28%]">Sub Category</th>
                    <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide w-[130px]">Product</th>
                    <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide w-[180px]">Threshold</th>
                    <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide w-[140px]">Classification</th>
                    <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide w-[90px]">Confidence</th>
                    <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide w-[110px]">Status</th>
                    <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide w-[60px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPgs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-[12px] text-gray-500">
                        No performance guarantees found
                      </td>
                    </tr>
                  ) : (
                    filteredPgs.map((pg) => {
                      const productDisplay = pg.product_line?.length > 0 
                        ? pg.product_line.join(', ') 
                        : '—';
                      
                      const thresholdDisplay = pg.threshold_value 
                        ? `${pg.threshold_value}${pg.threshold_unit ? ' ' + pg.threshold_unit : ''}`
                        : '—';

                      const classificationColor = 
                        isStandard(pg.classification) ? 'text-green-700 bg-green-50' :
                        isNonStandard(pg.classification) ? 'text-amber-700 bg-amber-50' :
                        isCustom(pg.classification) ? 'text-red-700 bg-red-50' :
                        'text-gray-700 bg-gray-50';

                      const confidenceValue = parseFloat(pg.confidence_score || '0');

                      const statusColor = 
                        pg.review_status === 'APPROVED' ? 'text-green-700 bg-green-50' :
                        pg.review_status === 'REJECTED' ? 'text-red-700 bg-red-50' :
                        'text-amber-700 bg-amber-50';

                      const statusIcon = 
                        pg.review_status === 'APPROVED' ? <CheckCircle2Icon className="h-3.5 w-3.5" /> :
                        pg.review_status === 'REJECTED' ? <XCircleIcon className="h-3.5 w-3.5" /> :
                        <AlertCircleIcon className="h-3.5 w-3.5" />;

                      const isExpanded = expandedPGId === pg.pg_record_id;
                      const detailData = isExpanded ? (pgDetail || pg) : null;

                      return (
                        <Fragment key={pg.pg_record_id}>
                          <tr
                            onClick={() => handleTogglePG(pg)}
                            className={`border-b border-gray-100 cursor-pointer transition-colors ${
                              isExpanded ? 'bg-navy-50/60' : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-2 py-2">
                              <ChevronDownIcon
                                className={`h-3.5 w-3.5 text-gray-500 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </td>
                            <td className="px-2 py-2 text-[12px] font-medium text-gray-800 break-words">{pg.pg_sub_category}</td>
                            <td className="px-2 py-2 text-[12px] text-gray-600 break-words">{productDisplay}</td>
                            <td className="px-2 py-2 text-[12px] text-gray-600 break-words">{thresholdDisplay}</td>
                            <td className="px-2 py-2">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium ${classificationColor}`}>
                                • {pg.classification}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-[12px] font-semibold text-gray-700">
                              {confidenceValue.toFixed(2)}
                            </td>
                            <td className="px-2 py-2">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium ${statusColor}`}>
                                {statusIcon}
                                • {pg.review_status === 'PENDING_REVIEW' ? 'Pending' : pg.review_status}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={(e) => handleOpenHistory(pg, e)}
                                aria-label="View history"
                                title="View history"
                                className="rounded p-1 text-navy-700 transition-colors hover:bg-navy-100"
                              >
                                <HistoryIcon className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${pg.pg_record_id}-detail`} className="border-b border-gray-200 bg-gray-50/60">
                              <td colSpan={8} className="px-4 py-4">
                                {pgDetailLoading ? (
                                  <div className="flex items-center justify-center py-6">
                                    <img
                                      src="/NylLogo.svg"
                                      alt="NYL Logo"
                                      className="h-8 w-8 animate-spin-y"
                                    />
                                  </div>
                                ) : (
                                  <PGDetailPanel pg={detailData!} />
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <PGHistory
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        title={`PG History — ${historyPGId}`}
      >
        {historyLoading ? (
          <div className="flex items-center justify-center py-12">
            <img
              src="/NylLogo.svg"
              alt="NYL Logo"
              className="h-10 w-10 animate-spin-y"
            />
          </div>
        ) : historyItems.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            No history available for this PG.
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-6 py-4">
            {historyItems.map((item) => (
              <div key={item.version_id} className="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center rounded bg-navy-700 px-2 py-0.5 text-[11px] font-bold text-white">
                      v{item.version_number}
                    </span>
                    <span className="text-[12px] font-semibold text-navy-800">{item.change_action}</span>
                  </div>
                  <span className="text-[11px] text-gray-500">
                    {new Date(item.changed_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </span>
                </div>
                <div className="text-[12px] text-gray-700 mb-1">
                  <span className="font-medium">Changed by:</span> {item.changed_by}
                </div>
                {item.change_reason && (
                  <div className="text-[12px] text-gray-700">
                    <span className="font-medium">Reason:</span> {item.change_reason}
                  </div>
                )}
                <div className="text-[11px] text-gray-500 mt-1">
                  {item.pg_category} · {item.pg_sub_category}
                </div>
              </div>
            ))}
          </div>
        )}
      </PGHistory>

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
    </div>
  );
}

function PGDetailPanel({ pg }: { pg: PerformanceGuarantee }) {
  const productDisplay = pg.product_line?.length > 0 ? pg.product_line.join(', ') : '—';
  const thresholdDisplay = pg.threshold_value
    ? `${pg.threshold_value}${pg.threshold_unit ? ' ' + pg.threshold_unit : ''}`
    : '—';
  const penaltyPct = pg.penalty_allocation_pct ? `${pg.penalty_allocation_pct}%` : '—';
  const penaltyDollar = pg.penalty_dollar_amount
    ? `$${parseFloat(pg.penalty_dollar_amount).toLocaleString()}`
    : '—';

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <InfoIcon className="h-4 w-4 text-navy-700" />
          <h3 className="text-[13px] font-semibold text-navy-800">Performance Guarantee Details</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <InfoField label="PG ID" value={pg.pg_id} />
          <InfoField label="Category" value={pg.pg_category} />
          <InfoField label="Sub Category" value={pg.pg_sub_category} />
          <InfoField label="Metric Name" value={pg.pg_metric_name} />
          <InfoField label="Department" value={pg.department} />
          <InfoField label="Operational Area" value={pg.operational_area} />
          <InfoField label="Product Line" value={productDisplay} />
          <InfoField label="Threshold" value={thresholdDisplay} />
          <InfoField label="Threshold Direction" value={pg.threshold_direction} />
          <InfoField label="Threshold Qualifier" value={pg.threshold_qualifier} />
          <InfoField label="Basis of Measurement" value={pg.basis_of_measurement} />
          <InfoField label="Evaluation Period" value={pg.evaluation_period} />
          <InfoField label="Reporting Cadence" value={pg.reporting_cadence} />
          <InfoField label="Penalty Cadence" value={pg.penalty_cadence} />
          <InfoField label="Penalty Type" value={pg.penalty_type} />
          <InfoField label="Penalty Allocation" value={penaltyPct} />
          <InfoField label="Penalty Dollar Amount" value={penaltyDollar} />
          <InfoField label="Metric Amount at Risk" value={pg.metric_amount_at_risk} />
          <InfoField label="Classification" value={pg.classification} />
          <InfoField label="Confidence Score" value={pg.confidence_score} />
          <InfoField label="Confidence Level" value={pg.confidence_level} />
          <InfoField label="Review Status" value={pg.review_status} />
          <InfoField label="Reviewed By" value={pg.reviewed_by} />
          <InfoField label="Reviewed At" value={pg.reviewed_at} />
          <InfoField label="Standard Reference" value={pg.standard_reference} />
          <InfoField label="Source System" value={pg.source_system} />
          <InfoField label="Results Source" value={pg.results_source} />
          <InfoField label="Metric Owner" value={pg.metric_owner} />
        </div>

        {pg.performance_standard_text && (
          <div className="mt-3 rounded border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Performance Standard</div>
            <div className="text-[13px] text-gray-800 break-words">{pg.performance_standard_text}</div>
          </div>
        )}
        {pg.evaluation_method_text && (
          <div className="mt-2 rounded border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Evaluation Method</div>
            <div className="text-[13px] text-gray-800 break-words">{pg.evaluation_method_text}</div>
          </div>
        )}
        {pg.classification_reason && (
          <div className="mt-2 rounded border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Classification Reason</div>
            <div className="text-[13px] text-gray-800 break-words">{pg.classification_reason}</div>
          </div>
        )}
        {pg.deviation_details && (
          <div className="mt-2 rounded border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Deviation Details</div>
            <div className="text-[13px] text-gray-800 break-words">{pg.deviation_details}</div>
          </div>
        )}
        {pg.notes && (
          <div className="mt-2 rounded border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Notes</div>
            <div className="text-[13px] text-gray-800 break-words">{pg.notes}</div>
          </div>
        )}
      </div>

      {pg.pg_validations && pg.pg_validations.length > 0 && (
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <h3 className="text-[13px] font-semibold text-navy-800 mb-3">Validations ({pg.pg_validations.length})</h3>
          <div className="flex flex-col gap-2">
            {pg.pg_validations.map((v, i) => (
              <ValidationCard key={`${v.rule_id}-${i}`} validation={v} />
            ))}
          </div>
        </div>
      )}
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
