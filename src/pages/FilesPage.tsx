import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon, RefreshCwIcon } from 'lucide-react';
import { uploadedFiles } from '../data/files';
import { UploadedFile } from '../types';
import { UploadPanel } from '../components/files/UploadPanel';
import { FilesTable } from '../components/files/FilesTable';

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
  const [files, setFiles] = useState<UploadedFile[]>(uploadedFiles);
  const [tab, setTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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

  const handleUpload = (names: string[]) => {
    const now = new Date();
    const stamp = now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const newFiles: UploadedFile[] = names.map((name, i) => ({
      id: `upload-${now.getTime()}-${i}`,
      name,
      documentType: 'Pending_classification',
      uploadedOn: stamp,
      policyNo: ['—'],
      slaTarget: '—',
      penaltyAllocation: '—',
      status: 'Processing'
    }));
    setFiles((prev) => [...newFiles, ...prev]);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 700);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-4">
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

        <FilesTable
          files={visibleFiles}
          onView={(file) =>
          navigate(`/files/${file.id}`, {
            state: { name: file.name, status: file.status }
          })
          } />
        
      </section>
    </div>);

}