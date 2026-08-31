import React from 'react';
import { CheckCircleIcon, XCircleIcon, LoaderIcon, ClockIcon, AlertCircleIcon } from 'lucide-react';
import { FileStatus } from '../../types';

const styles: Record<FileStatus, string> = {
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Failed: 'border-red-200 bg-red-50 text-red-600',
  Processing: 'border-amber-200 bg-amber-50 text-amber-700',
  Processed: 'border-gray-200 bg-gray-100 text-gray-600',
  'Pending Review': 'border-blue-200 bg-blue-50 text-blue-700',
  'Partially Reviewed': 'border-purple-200 bg-purple-50 text-purple-700',
  Approved: 'border-green-200 bg-green-50 text-green-700',
  Rejected: 'border-red-200 bg-red-50 text-red-700'
};

export function StatusBadge({ status }: {status: FileStatus;}) {
  const Icon =
    status === 'Completed' ? CheckCircleIcon :
    status === 'Approved' ? CheckCircleIcon :
    status === 'Failed' ? XCircleIcon :
    status === 'Rejected' ? XCircleIcon :
    status === 'Processing' ? LoaderIcon :
    status === 'Pending Review' ? ClockIcon :
    status === 'Partially Reviewed' ? AlertCircleIcon :
    null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium ${styles[status]}`}>
      
      {Icon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
      {status}
    </span>);

}