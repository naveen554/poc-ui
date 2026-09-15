import React from 'react';
import { CheckCircleIcon, XCircleIcon, LoaderIcon, ClockIcon, AlertCircleIcon, LockIcon, EyeIcon } from 'lucide-react';
import { FileStatus } from '../../types';

const styles: Record<FileStatus, string> = {
  Processing: 'border-amber-200 bg-amber-50 text-amber-700',
  'Pending Review': 'border-blue-200 bg-blue-50 text-blue-700',
  'In Review': 'border-indigo-200 bg-indigo-50 text-indigo-700',
  'Partially Reviewed': 'border-purple-200 bg-purple-50 text-purple-700',
  'Approved for Storage': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Blocked - Pending Action': 'border-orange-200 bg-orange-50 text-orange-700',
  Failed: 'border-red-200 bg-red-50 text-red-600'
};

export function StatusBadge({ status }: {status: FileStatus;}) {
  const Icon =
    status === 'Processing' ? LoaderIcon :
    status === 'Pending Review' ? ClockIcon :
    status === 'In Review' ? EyeIcon :
    status === 'Partially Reviewed' ? AlertCircleIcon :
    status === 'Approved for Storage' ? CheckCircleIcon :
    status === 'Blocked - Pending Action' ? LockIcon :
    status === 'Failed' ? XCircleIcon :
    null;

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-2xs font-medium ${styles[status]}`}>
      
      {Icon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
      {status}
    </span>);

}