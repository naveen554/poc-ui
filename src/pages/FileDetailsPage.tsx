import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  FileTextIcon,
  RefreshCwIcon,
  EyeIcon } from
'lucide-react';
import { FileDetail } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MetricsBar } from '../components/details/MetricsBar';
import { ExtractedInformation } from '../components/details/ExtractedInformation';
import { PerformanceGuarantees } from '../components/details/PerformanceGuarantees';
import { getContractDetails, getContractPipelineStatus, getPGsByContract, PerformanceGuarantee } from '../services/api';
import { mapContractToFileDetail } from '../services/mappers';
import { Tooltip } from '../components/ui/Tooltip';
import { Dialog } from '../components/ui/Dialog';
import { Loader } from '../components/ui/Loader';
import { getFeatureFlag, FeatureFlagKeys } from '../config/launchdarkly';

export function FileDetailsPage() {
  const { fileId = '' } = useParams();
  const navigate = useNavigate();
  
  const [detail, setDetail] = useState<FileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pgs, setPgs] = useState<PerformanceGuarantee[]>([]);
  const [pgsLoading, setPgsLoading] = useState(false);
  const showPerformanceGuarantees = getFeatureFlag(FeatureFlagKeys.PERFORMANCE_GUARANTEE);

  useEffect(() => {
    loadContractDetails();
  }, [fileId]);

  const loadContractDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const contract = await getContractDetails(fileId);
      const mapped = mapContractToFileDetail(contract);
      
      setDocumentUrl(contract.document_url);

      try {
        const pipelineStatus = await getContractPipelineStatus(fileId);
        mapped.currentProcess = pipelineStatus.pipelineStatus;
      } catch (err) {
        console.error('Failed to get pipeline status:', err);
      }
      
      setDetail(mapped);

      if (showPerformanceGuarantees) {
        setPgsLoading(true);
        try {
          const pgsData = await getPGsByContract(fileId, 'PENDING_REVIEW');
          setPgs(pgsData);
        } catch (err) {
          console.error('Failed to load PGs:', err);
          setPgs([]);
        } finally {
          setPgsLoading(false);
        }
      }
    } catch (err) {
      console.error('Failed to load contract details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load contract details');
    } finally {
      setLoading(false);
    }
  };

  const handleReprocess = async () => {
    if (!detail) return;
    
    setRefreshing(true);
    try {
      const pipelineStatus = await getContractPipelineStatus(fileId);
      setDetail({
        ...detail,
        currentProcess: pipelineStatus.pipelineStatus
      });
    } catch (err) {
      console.error('Failed to refresh pipeline status:', err);
    } finally {
      setTimeout(() => setRefreshing(false), 700);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (error || !detail) {
    return (
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-4">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">{error || 'Contract not found'}</p>
          <button
            onClick={() => navigate('/files')}
            className="mt-2 text-sm font-semibold text-red-900 underline"
          >
            Back to Files
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm">
        <button
          type="button"
          onClick={() => navigate('/files')}
          aria-label="Back to files"
          className="rounded p-1 text-gray-500 transition-colors duration-150 ease-out hover:bg-gray-100 hover:text-navy-700">
          
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
        <FileTextIcon className="h-4 w-4 text-red-500" aria-hidden="true" />
        <Tooltip content={detail.fileName} className="block overflow-hidden max-w-[400px]">
          <h1 className="text-[15px] font-semibold text-navy-800 truncate">{detail.fileName}</h1>
        </Tooltip>
        <StatusBadge status={detail.status} />
        <p className="ml-3 text-[12px] text-gray-500">
          Current Process: <span className="font-semibold text-navy-700">{detail.currentProcess}</span>
        </p>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            disabled={!documentUrl}
            title={documentUrl ? 'Preview document' : 'Document preview not available'}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 ease-out ${
              documentUrl 
                ? 'bg-navy-700 text-white hover:bg-navy-800' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}>
            <EyeIcon className="h-4 w-4" />
            Preview Contract
          </button>
          <button
            type="button"
            onClick={handleReprocess}
            aria-label="Reprocess document"
            className="rounded p-1.5 text-navy-700 transition-colors duration-150 ease-out hover:bg-navy-100">
            
            <RefreshCwIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <MetricsBar detail={detail} />

      <ExtractedInformation fields={detail.extractedFields} />

      {showPerformanceGuarantees && (
        pgsLoading ? (
          <div className="rounded-md border border-gray-200 bg-white shadow-sm">
            <div className="flex h-9 shrink-0 items-center gap-2 bg-navy-700 px-3 text-white">
              <h2 className="text-[13px] font-semibold">Performance Guarantees</h2>
            </div>
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <img 
                  src="/NylLogo.svg" 
                  alt="NYL Logo" 
                  className="h-12 w-12 animate-spin-y"
                />
                <div className="text-sm text-gray-500">Loading performance guarantees...</div>
              </div>
            </div>
          </div>
        ) : (
          <PerformanceGuarantees pgs={pgs} />
        )
      )}

      <Dialog open={showPreview} onClose={() => setShowPreview(false)} title="Contract" size="80%">
        <div className="bg-neutral-900 p-6 relative" style={{ minHeight: '80vh' }}>
          {documentUrl ? (
            <iframe
              src={`${documentUrl}#toolbar=0`}
              title={`Preview of ${detail.fileName}`}
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
    </div>);

}