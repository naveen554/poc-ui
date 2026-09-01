import { EyeIcon, Trash2Icon } from 'lucide-react';
import { UploadedFile } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { Tooltip } from '../ui/Tooltip';

interface FilesTableProps {
  files: UploadedFile[];
  onView: (file: UploadedFile) => void;
  onDelete?: (file: UploadedFile) => void;
}

export function FilesTable({ files, onView, onDelete }: FilesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left table-fixed">
        <thead>
          <tr className="bg-navy-700 text-white">
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold uppercase tracking-wide w-[200px]">Client</th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold uppercase tracking-wide w-[180px]">Policies</th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold uppercase tracking-wide w-[80px]">PGs</th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold uppercase tracking-wide w-[100px]">Completed</th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold uppercase tracking-wide w-[90px]">Pending</th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold uppercase tracking-wide w-[130px]">Status</th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold uppercase tracking-wide w-[170px]">Uploaded</th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold uppercase tracking-wide w-[80px]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.length === 0 &&
          <tr>
              <td colSpan={8} className="px-3 py-10 text-center text-[13px] text-gray-500">
                No contracts match your search.
              </td>
            </tr>
          }
          {files.map((file) => {
            const pgsDisplay = file.pgsTotal > 0 ? file.pgsTotal.toString() : '—';
            const pendingDisplay = file.pgsPending > 0 ? file.pgsPending.toString() : '0';
            const completed = Math.max(file.pgsTotal - file.pgsPending, 0);
            const completedDisplay = file.pgsTotal > 0 ? completed.toString() : '0';
            const policiesDisplay = file.policies.join(', ');
            
            return (
              <tr key={file.id} className="border-b border-gray-100 transition-colors duration-150 ease-out hover:bg-navy-50/60">
                <td className="px-3 py-3 w-[200px]">
                  <Tooltip content={file.clientName} className="block overflow-hidden">
                    <span className="truncate text-[13px] font-medium text-navy-700 block">
                      {file.clientName}
                    </span>
                  </Tooltip>
                </td>
                <td className="px-3 py-3 w-[180px]">
                  <Tooltip content={policiesDisplay} className="block overflow-hidden">
                    <span className="truncate text-[12px] text-gray-600 block">
                      {policiesDisplay}
                    </span>
                  </Tooltip>
                </td>
                <td className="px-3 py-3 text-[13px] font-semibold text-navy-700 w-[80px]">
                  {pgsDisplay}
                </td>
                <td className="px-3 py-3 text-[13px] font-semibold text-emerald-600 w-[100px]">
                  {completedDisplay}
                </td>
                <td className="px-3 py-3 text-[13px] font-semibold text-amber-600 w-[90px]">
                  {pendingDisplay}
                </td>
                <td className="px-3 py-3 w-[130px]">
                  <StatusBadge status={file.status} />
                </td>
                <td className="px-3 py-3 w-[170px]">
                  <Tooltip content={file.uploadedOn} className="block overflow-hidden">
                    <span className="truncate text-[12px] text-gray-600 block">{file.uploadedOn}</span>
                  </Tooltip>
                </td>
                <td className="px-3 py-3 w-[80px]">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onView(file)}
                      aria-label={`View details for ${file.clientName}`}
                      className="rounded p-1 text-navy-700 transition-colors duration-150 ease-out hover:bg-navy-100">
                      
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(file)}
                        aria-label={`Delete ${file.clientName}`}
                        className="rounded p-1 text-red-600 transition-colors duration-150 ease-out hover:bg-red-100">
                        
                        <Trash2Icon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>);

}
