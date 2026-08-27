import { useState, Fragment } from 'react';
import { ChevronRightIcon, ChevronDownIcon, EyeIcon, FileTextIcon, Trash2Icon } from 'lucide-react';
import { UploadedFile } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { Tooltip } from '../ui/Tooltip';

interface FilesTableProps {
  files: UploadedFile[];
  onView: (file: UploadedFile) => void;
  onDelete?: (file: UploadedFile) => void;
}

function PdfIcon() {
  return <FileTextIcon className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />;
}

export function FilesTable({ files, onView, onDelete }: FilesTableProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1240px] border-collapse text-left table-fixed">
        <thead>
          <tr className="bg-navy-700 text-white">
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold w-[220px]">Client Name</th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold w-[120px]">Agreement Type</th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold w-[160px]">Uploaded On</th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold w-[220px]">Policy Numbers</th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold w-[150px]">Validations</th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold w-[180px]">Penalty At Risk</th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold w-[110px]">Status</th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold w-[110px]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.length === 0 &&
          <tr>
              <td colSpan={8} className="px-3 py-10 text-center text-[13px] text-gray-500">
                No files match your search.
              </td>
            </tr>
          }
          {files.map((file) => {
            const hasVersions = !!file.versions?.length;
            const isOpen = !!expanded[file.id];
            return (
              <Fragment key={file.id}>
                <tr className="border-b border-gray-100 transition-colors duration-150 ease-out hover:bg-navy-50/60">
                  <td className="px-3 py-2.5 w-[220px]">
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
                      <Tooltip content={file.name} className="block overflow-hidden min-w-0">
                        <span className="truncate text-[12.5px] font-medium text-gray-800 block">
                          {file.name}
                        </span>
                      </Tooltip>
                      {hasVersions &&
                      <span className="rounded-full bg-navy-100 px-1.5 py-0.5 text-2xs font-medium text-navy-700">
                          {file.versions!.length + 1} versions
                        </span>
                      }
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-600 w-[120px]">
                    <Tooltip content={file.documentType} className="block overflow-hidden">
                      <span className="truncate block">
                        {file.documentType}
                      </span>
                    </Tooltip>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-600 w-[160px]">
                    <span className="whitespace-nowrap">{file.uploadedOn}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-600 w-[220px]">
                    <Tooltip content={file.policyNo} className="block overflow-hidden">
                      <span className="truncate block">
                        {file.policyNo.join(', ')}
                      </span>
                    </Tooltip>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-600 w-[150px]">
                    <Tooltip content={file.slaTarget} className="block overflow-hidden">
                      <span className="truncate block">
                        {file.slaTarget}
                      </span>
                    </Tooltip>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-600 w-[180px]">
                    <Tooltip content={file.penaltyAllocation} className="block overflow-hidden">
                      <span className="truncate block">
                        {file.penaltyAllocation}
                      </span>
                    </Tooltip>
                  </td>
                  <td className="px-3 py-2.5 w-[110px]">
                    <StatusBadge status={file.status} />
                  </td>
                  <td className="px-3 py-2.5 w-[110px]">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onView(file)}
                        aria-label={`View details for ${file.name}`}
                        className="rounded p-1 text-navy-700 transition-colors duration-150 ease-out hover:bg-navy-100">
                        
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(file)}
                          aria-label={`Delete ${file.name}`}
                          className="rounded p-1 text-red-600 transition-colors duration-150 ease-out hover:bg-red-100">
                          
                          <Trash2Icon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {hasVersions &&
                isOpen &&
                file.versions!.map((version) =>
                <tr key={version.id} className="border-b border-gray-100 bg-gray-50/70">
                      <td className="px-3 py-2.5 w-[220px]">
                        <div className="flex items-start gap-1.5 pl-6">
                          <PdfIcon />
                          <div className="min-w-0 flex-1">
                            <Tooltip content={version.name} className="block overflow-hidden">
                              <p className="truncate text-[12.5px] text-gray-700">{version.name}</p>
                            </Tooltip>
                            <p className="text-2xs text-navy-600 underline">{version.versionLabel}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-gray-600 w-[120px]">
                        <Tooltip content={version.documentType} className="block overflow-hidden">
                          <span className="truncate block">
                            {version.documentType}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-gray-600 w-[160px]">
                        <span className="whitespace-nowrap">{version.uploadedOn}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-gray-600 w-[220px]">
                        <Tooltip content={version.policyNo} className="block overflow-hidden">
                          <span className="truncate block">
                            {version.policyNo.join(', ')}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-gray-600 w-[150px]">
                        <Tooltip content={version.slaTarget} className="block overflow-hidden">
                          <span className="truncate block">
                            {version.slaTarget}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-gray-600 w-[180px]">
                        <Tooltip content={version.penaltyAllocation} className="block overflow-hidden">
                          <span className="truncate block">
                            {version.penaltyAllocation}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="px-3 py-2.5 w-[110px]">
                        <StatusBadge status={version.status} />
                      </td>
                      <td className="px-3 py-2.5 w-[110px]">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onView(version)}
                            aria-label={`View details for ${version.name} ${version.versionLabel}`}
                            className="rounded p-1 text-navy-700 transition-colors duration-150 ease-out hover:bg-navy-100">
                            
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(version)}
                              aria-label={`Delete ${version.name} ${version.versionLabel}`}
                              className="rounded p-1 text-red-600 transition-colors duration-150 ease-out hover:bg-red-100">
                              
                              <Trash2Icon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                )}
              </Fragment>);

          })}
        </tbody>
      </table>
    </div>);

}