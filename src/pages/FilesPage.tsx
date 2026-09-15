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

export function FilesPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadedFile[]>([]);
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

  const visibleFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter((file) => {
      const haystack = [file.clientName, ...file.policies, file.status].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [files, query]);

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
        clientName: file.name.replace('.pdf', '').replace(/_/g, ' '),
        policies: ['—'],
        pgsTotal: 0,
        pgsPending: 0,
        uploadedOn: stamp,
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
                  clientName: clientHint,
                  policies: ['—'],
                  pgsTotal: 0,
                  pgsPending: 0,
                  uploadedOn: stamp,
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
              ? { ...f, status: 'Failed' as const, clientName: `${clientHint} (Upload Failed)` }
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
        <div className="flex flex-nowrap items-center gap-3 border-b border-gray-100 px-3 py-2.5">
          <label className="relative w-[300px] shrink-0">
            <span className="sr-only">Search contracts</span>
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by client name or policy number..."
              className="h-8 w-full rounded border border-gray-300 pl-8 pr-2 text-[12.5px] text-gray-700 outline-none transition-colors duration-150 ease-out placeholder:text-gray-400 focus:border-navy-700" />
            
          </label>

          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Refresh file list"
            className="ml-auto rounded bg-navy-700 p-1.5 text-white transition-colors duration-150 ease-out hover:bg-navy-800">
            
            <RefreshCwIcon className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
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
            navigate(`/pg-management/${file.id}`, {
              state: { clientName: file.clientName, status: file.status }
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
        title="Delete Contract" 
        size="md"
      >
        <div className="px-6 py-4">
          <p className="text-sm text-gray-700 mb-6">
            Are you sure you want to delete the contract for <span className="font-semibold text-gray-900">"{fileToDelete?.clientName}"</span>?
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