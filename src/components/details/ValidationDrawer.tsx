import React from 'react';
import { CheckCircleIcon, XCircleIcon } from 'lucide-react';
import { ValidationResult } from '../../types';
import { Drawer } from '../ui/Drawer';

interface ValidationDrawerProps {
  open: boolean;
  onClose: () => void;
  results: ValidationResult[];
}

function Meta({ label, value }: {label: string;value: string;}) {
  return (
    <div className="mb-2">
      <p className="text-2xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-[12.5px] text-gray-800">{value}</p>
    </div>);

}

export function ValidationDrawer({ open, onClose, results }: ValidationDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title="Validation Results">
      <div className="divide-y divide-gray-200">
        {results.map((result) => {
          const passed = result.status === 'Passed';
          return (
            <article key={result.id} className="px-3 py-3">
              <Meta label="Validation Type" value={result.validationType} />
              <Meta label="Process Name" value={result.processName} />
              <Meta label="Field Name" value={result.fieldName} />

              <div className="mb-2">
                <p className="text-2xs uppercase tracking-wide text-gray-400">Status</p>
                <span
                  className={[
                  'mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium',
                  passed ?
                  'border-emerald-200 bg-emerald-50 text-emerald-700' :
                  'border-red-200 bg-red-50 text-red-600'].
                  join(' ')}>
                  
                  {passed ? <CheckCircleIcon className="h-3 w-3" /> : <XCircleIcon className="h-3 w-3" />}
                  {result.status}
                </span>
              </div>

              <p className="text-2xs uppercase tracking-wide text-gray-400">Comparison</p>
              <dl
                className={[
                'mt-1 space-y-1 rounded border px-2.5 py-2',
                passed ? 'border-emerald-100 bg-emerald-50/60' : 'border-red-100 bg-red-50/60'].
                join(' ')}>
                
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-[11.5px] text-gray-500">Expected:</dt>
                  <dd className="text-[11.5px] font-medium text-gray-800">{result.expected}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-[11.5px] text-gray-500">Actual:</dt>
                  <dd className="text-[11.5px] font-medium text-navy-700">{result.actual}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-[11.5px] text-gray-500">Match:</dt>
                  <dd
                    className={`text-[11.5px] font-semibold ${
                    result.match === 'Yes' ? 'text-emerald-700' : 'text-red-600'}`
                    }>
                    
                    {result.match}
                  </dd>
                </div>
              </dl>
            </article>);

        })}
      </div>
    </Drawer>);

}