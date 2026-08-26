import React, { useState } from 'react';
import { ChevronRightIcon, ChevronDownIcon, EyeIcon, FileTextIcon } from 'lucide-react';
import { UploadedFile } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';

interface FilesTableProps {
  files: UploadedFile[];
  onView: (file: UploadedFile) => void;
}

const columns = [
'File Name',
'Contract Header',
'Uploaded On',
'Policy No',
'SLA Targets',
'Penalty Allocation',
'Status',
'Action'];


function PdfIcon() {
  return <FileTextIcon className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />;
}

export function FilesTable({ files, onView }: FilesTableProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-left">
        <thead>
          <tr className="bg-navy-700 text-white">
            {columns.map((col) =>
            <th key={col} scope="col" className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold">
                {col}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {files.length === 0 &&
          <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-[13px] text-gray-500">
                No files match your search.
              </td>
            </tr>
          }
          {files.map((file) => {
            const hasVersions = !!file.versions?.length;
            const isOpen = !!expanded[file.id];
            return (
              <React.Fragment key={file.id}>
                <tr className="border-b border-gray-100 transition-colors duration-150 ease-out hover:bg-navy-50/60">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {hasVersions ?
                      <button
                        type="button"
                        onClick={() => toggle(file.id)}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? 'Collapse' : 'Expand'} versions of ${file.name}`}
                        className="rounded p-0.5 text-gray-500 transition-colors duration-150 ease-out hover:bg-gray-100">
                        
                          {isOpen ?
                        <ChevronDownIcon className="h-3.5 w-3.5" /> :

                        <ChevronRightIcon className="h-3.5 w-3.5" />
                        }
                        </button> :

                      <span className="w-[18px]" />
                      }
                      <PdfIcon />
                      <span className="max-w-[190px] truncate text-[12.5px] font-medium text-gray-800" title={file.name}>
                        {file.name}
                      </span>
                      {hasVersions &&
                      <span className="rounded-full bg-navy-100 px-1.5 py-0.5 text-2xs font-medium text-navy-700">
                          {file.versions!.length + 1} versions
                        </span>
                      }
                    </div>
                  </td>
                  <td className="max-w-[160px] truncate px-3 py-2.5 text-[12px] text-gray-600" title={file.documentType}>
                    {file.documentType}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-gray-600">{file.uploadedOn}</td>
                  <td className="max-w-[160px] px-3 py-2.5 text-[12px] text-gray-600" title={file.policyNo.join(', ')}>
                    {file.policyNo.join(', ')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-gray-600">{file.slaTarget}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-gray-600">{file.penaltyAllocation}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={file.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => onView(file)}
                      aria-label={`View details for ${file.name}`}
                      className="rounded p-1 text-navy-700 transition-colors duration-150 ease-out hover:bg-navy-100">
                      
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>

                {hasVersions &&
                isOpen &&
                file.versions!.map((version) =>
                <tr key={version.id} className="border-b border-gray-100 bg-gray-50/70">
                      <td className="px-3 py-2.5">
                        <div className="flex items-start gap-1.5 pl-6">
                          <PdfIcon />
                          <div className="min-w-0">
                            <p className="truncate text-[12.5px] text-gray-700">{version.name}</p>
                            <p className="text-2xs text-navy-600 underline">{version.versionLabel}</p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-2.5 text-[12px] text-gray-600">
                        {version.documentType}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-gray-600">{version.uploadedOn}</td>
                      <td className="max-w-[160px] px-3 py-2.5 text-[12px] text-gray-600" title={version.policyNo.join(', ')}>
                        {version.policyNo.join(', ')}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-gray-600">{version.slaTarget}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-gray-600">{version.penaltyAllocation}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={version.status} />
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                      type="button"
                      onClick={() => onView(version)}
                      aria-label={`View details for ${version.name} ${version.versionLabel}`}
                      className="rounded p-1 text-navy-700 transition-colors duration-150 ease-out hover:bg-navy-100">
                      
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                )}
              </React.Fragment>);

          })}
        </tbody>
      </table>
    </div>);

}