import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon, RefreshCwIcon } from 'lucide-react';
import { UploadedFile } from '../types';
import { UploadPanel } from '../components/files/UploadPanel';
import { FilesTable } from '../components/files/FilesTable';
import { uploadContract, listContracts, getContractPipelineStatus, deleteContract } from '../services/api';
import { mapContractToUploadedFile } from '../services/mappers';
import { Toast, ToastType } from '../components/ui/Toast';
import { Dialog } from '../components/ui/Dialog';

type TabKey = 'all' | 'progress' | 'completed' | 'failed';

const tabs: {key: TabKey;label: string;}[] = [
{ key: 'all', label: 'All' },
{ key: 'progress', label: 'In Progress' },
{ key: 'completed', label: 'Completed' },
{ key: 'failed', label: 'Failed' }];


function matchesTab(file: UploadedFile, tab: TabKey) {
  if (tab === 'all') return true;
  if (tab === 'completed') return file.status === 'Completed';
  if (tab === 'failed') return file.status === 'Failed';
  return file.status === 'Processing' || file.status === 'Processed';
}

export function FilesPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [tab, setTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<UploadedFile | null>(null);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const contracts = await listContracts();
      const mappedFiles = contracts.map(mapContractToUploadedFile);
      setFiles(mappedFiles);
    } catch (error) {
      console.error('Failed to load contracts:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (file: UploadedFile) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;

    try {
      await deleteContract(fileToDelete.id);
      setToast({ message: 'Contract deleted successfully', type: 'success' });
      setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete contract';
      setToast({ message: errorMessage, type: 'error' });
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const counts = useMemo(() => {
    const flat = files.flatMap((f) => [f, ...(f.versions ?? [])]);
    return {
      all: flat.length,
      progress: flat.filter((f) => f.status === 'Processing' || f.status === 'Processed').length,
      completed: flat.filter((f) => f.status === 'Completed').length,
      failed: flat.filter((f) => f.status === 'Failed').length
    };
  }, [files]);

  const visibleFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return files.filter((file) => {
      const inTab = matchesTab(file, tab) || (file.versions ?? []).some((v) => matchesTab(v, tab));
      if (!inTab) return false;
      if (!q) return true;
      const haystack = [file.name, file.documentType, ...file.policyNo, file.slaTarget, file.penaltyAllocation, file.status].
      join(' ').
      toLowerCase();
      return haystack.includes(q);
    });
  }, [files, tab, query]);

  const handleUpload = async (uploadFiles: File[]) => {
    setUploadError(null);
    
    const now = new Date();
    const stamp = now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const placeholders: UploadedFile[] = uploadFiles.map((file, i) => ({
      id: `uploading-${now.getTime()}-${i}`,
      name: file.name,
      documentType: 'Uploading...',
      uploadedOn: stamp,
      policyNo: ['—'],
      slaTarget: '—',
      penaltyAllocation: '—',
      status: 'Processing' as const
    }));
    
    setFiles((prev) => [...placeholders, ...prev]);

    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      const placeholderId = placeholders[i].id;
      
      try {
        const clientHint = file.name.replace('.pdf', '').replace(/_/g, ' ');
        
        const response = await uploadContract(file, clientHint);
        
        setFiles((prev) => 
          prev.map((f) => 
            f.id === placeholderId
              ? {
                  id: response.contractId,
                  name: file.name,
                  documentType: 'Processing',
                  uploadedOn: stamp,
                  policyNo: ['—'],
                  slaTarget: '—',
                  penaltyAllocation: '—',
                  status: 'Processing' as const
                }
              : f
          )
        );
        
        pollContractStatus(response.contractId);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        setUploadError(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        setFiles((prev) => 
          prev.map((f) => 
            f.id === placeholderId
              ? { ...f, status: 'Failed' as const, documentType: 'Upload Failed' }
              : f
          )
        );
      }
    }
  };

  const pollContractStatus = async (contractId: string) => {
    let attempts = 0;
    const maxAttempts = 24;
    
    const poll = async () => {
      if (attempts >= maxAttempts) return;
      attempts++;
      
      try {
        const statusData = await getContractPipelineStatus(contractId);
        
        if (statusData.pipelineStatus !== 'PROCESSING' && statusData.pipelineStatus !== 'PENDING') {
          await loadContracts();
          return;
        }
        
        setTimeout(poll, 5000);
      } catch (error) {
        console.error('Failed to poll status:', error);
      }
    };
    
    setTimeout(poll, 5000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContracts();
    setTimeout(() => setRefreshing(false), 700);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-4">
      {uploadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {uploadError}
          <button
            onClick={() => setUploadError(null)}
            className="ml-2 font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}
      
      <UploadPanel onFilesSelected={handleUpload} />

      <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-3 py-2.5">
          <label className="relative w-[240px]">
            <span className="sr-only">Search documents</span>
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search docs..."
              className="h-8 w-full rounded border border-gray-300 pl-8 pr-2 text-[12.5px] text-gray-700 outline-none transition-colors duration-150 ease-out placeholder:text-gray-400 focus:border-navy-700" />
            
          </label>

          <div className="ml-auto flex items-center gap-1" role="tablist" aria-label="Filter files by status">
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={[
                  'rounded px-2.5 py-1.5 text-[12px] transition-colors duration-150 ease-out',
                  active ?
                  'bg-navy-100 font-semibold text-navy-700 underline decoration-navy-700 decoration-2 underline-offset-4' :
                  'text-gray-500 hover:bg-gray-100 hover:text-navy-700'].
                  join(' ')}>
                  
                  {t.label} ({counts[t.key]})
                </button>);

            })}
            <button
              type="button"
              onClick={handleRefresh}
              aria-label="Refresh file list"
              className="ml-1 rounded bg-navy-700 p-1.5 text-white transition-colors duration-150 ease-out hover:bg-navy-800">
              
              <RefreshCwIcon className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <img 
                src="/NylLogo.svg" 
                alt="NYL Logo" 
                className="h-12 w-12 animate-spin-y"
              />
              <div className="text-sm text-gray-500">Loading contracts...</div>
            </div>
          </div>
        ) : (
          <FilesTable
            files={visibleFiles}
            onView={(file) =>
            navigate(`/files/${file.id}`, {
              state: { name: file.name, status: file.status }
            })
            }
            onDelete={handleDelete} />
        )}
        
      </section>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => {
          setDeleteDialogOpen(false);
          setFileToDelete(null);
        }} 
        title="Delete" 
        size="md"
      >
        <div className="px-6 py-4">
          <p className="text-sm text-gray-700 mb-6">
            Are you sure you want to delete <span className="font-semibold text-gray-900">"{fileToDelete?.name}"</span>?
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setDeleteDialogOpen(false);
                setFileToDelete(null);
              }}
              className="rounded bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Dialog>
    </div>);

}