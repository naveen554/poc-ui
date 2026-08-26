import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  FileTextIcon,
  RefreshCwIcon,
  DownloadIcon } from
'lucide-react';
import { getFileDetail, documentPreviewUrl } from '../data/fileDetails';
import { FileStatus } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Panel } from '../components/ui/Panel';
import { MetricsBar } from '../components/details/MetricsBar';
import { ExtractedInformation } from '../components/details/ExtractedInformation';

export function FileDetailsPage() {
  const { fileId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as {name?: string;status?: FileStatus;};
  const detail = getFileDetail(fileId, state.name ?? `${fileId}.pdf`, state.status ?? 'Completed');

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
        <h1 className="text-[15px] font-semibold text-navy-800">{detail.fileName}</h1>
        <StatusBadge status={detail.status} />
        <p className="ml-3 text-[12px] text-gray-500">
          Current Process: <span className="font-semibold text-navy-700">{detail.currentProcess}</span>
        </p>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Reprocess document"
            className="rounded p-1.5 text-navy-700 transition-colors duration-150 ease-out hover:bg-navy-100">
            
            <RefreshCwIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <MetricsBar detail={detail} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
        <div className="h-[620px]">
          <Panel
            title="Document Preview"
            action={
            <a
              href={documentPreviewUrl}
              download
              aria-label="Download document"
              className="rounded p-1 transition-colors duration-150 ease-out hover:bg-white/15">

                <DownloadIcon className="h-4 w-4" />
              </a>
            }
            className="h-full"
            bodyClassName="overflow-y-auto bg-neutral-900 p-4">

            <img
              src={documentPreviewUrl}
              alt={`Scanned page of ${detail.fileName}`}
              className="mx-auto w-full max-w-[540px] rounded bg-white shadow-lg" />

          </Panel>
        </div>

        <div className="h-[620px]">
          <ExtractedInformation fields={detail.extractedFields} />
        </div>
      </div>
    </div>);

}