import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, AlertTriangleIcon, PencilIcon, CheckIcon, XIcon } from 'lucide-react';
import { ExtractedField } from '../../types';
import { Panel } from '../ui/Panel';

function confidenceTone(confidence: number) {
  if (confidence >= 90) return 'text-emerald-600';
  if (confidence >= 75) return 'text-amber-600';
  return 'text-red-500';
}

export function ExtractedInformation({ fields }: { fields: ExtractedField[] }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
  Object.fromEntries(fields.map((f) => [f.label, f.value]))
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editingAll, setEditingAll] = useState(false);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);

  useEffect(() => {
    setValues(Object.fromEntries(fields.map((f) => [f.label, f.value])));
    setDrafts({});
    setEditingAll(false);
    setEditingLabel(null);
  }, [fields]);

  const startEditAll = () => {
    setDrafts(Object.fromEntries(fields.map((f) => [f.label, values[f.label]])));
    setEditingLabel(null);
    setEditingAll(true);
  };

  const saveAll = () => {
    setValues((prev) => ({ ...prev, ...drafts }));
    setDrafts({});
    setEditingAll(false);
  };

  const cancelAll = () => {
    setDrafts({});
    setEditingAll(false);
  };

  const startEditOne = (label: string) => {
    setDrafts((prev) => ({ ...prev, [label]: values[label] }));
    setEditingLabel(label);
  };

  const saveOne = (label: string) => {
    setValues((prev) => ({ ...prev, [label]: drafts[label] ?? prev[label] }));
    setEditingLabel(null);
  };

  const cancelOne = (label: string) => {
    setEditingLabel(null);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[label];
      return next;
    });
  };

  return (
    <Panel
      title="Extracted Information"
      action={
      <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-white/90">Accuracy</span>
          {editingAll ?
        <div className="flex items-center gap-1">
              <button
            type="button"
            onClick={saveAll}
            aria-label="Save all extracted fields"
            className="rounded p-1 text-white transition-colors duration-150 ease-out hover:bg-white/15">

                <CheckIcon className="h-3.5 w-3.5" />
              </button>
              <button
            type="button"
            onClick={cancelAll}
            aria-label="Cancel editing all fields"
            className="rounded p-1 text-white transition-colors duration-150 ease-out hover:bg-white/15">

                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div> :

        <button
          type="button"
          onClick={startEditAll}
          aria-label="Edit all extracted fields"
          className="rounded p-1 text-white transition-colors duration-150 ease-out hover:bg-white/15">

              <PencilIcon className="h-3.5 w-3.5" />
            </button>
        }
        </div>
      }
      className="h-full"
      bodyClassName="overflow-y-auto p-2.5">

      <ul className="space-y-2">
        {fields.map((field) => {
          const good = field.confidence >= 90;
          const isEditing = editingAll || editingLabel === field.label;
          return (
            <li key={field.label} className="rounded border border-gray-200 bg-white px-2.5 py-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11.5px] text-navy-600">{field.label}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <span className={`text-[11.5px] font-semibold ${confidenceTone(field.confidence)}`}>
                    {field.confidence}%
                  </span>
                  {good ?
                  <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500" aria-label="High confidence" /> :

                  <AlertTriangleIcon className="h-3.5 w-3.5 text-amber-500" aria-label="Needs review" />
                  }
                </div>
              </div>

              {isEditing ?
              <div className="mt-1 flex items-center gap-1">
                  <input
                  autoFocus={!editingAll}
                  value={drafts[field.label] ?? values[field.label]}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [field.label]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') editingAll ? saveAll() : saveOne(field.label);
                    if (e.key === 'Escape') editingAll ? cancelAll() : cancelOne(field.label);
                  }}
                  className="w-full rounded border border-navy-300 px-1.5 py-1 text-[13px] font-semibold text-gray-800 outline-none focus:border-navy-700" />

                  {!editingAll &&
                <>
                      <button
                    type="button"
                    onClick={() => saveOne(field.label)}
                    aria-label={`Save ${field.label}`}
                    className="shrink-0 rounded p-1 text-emerald-600 transition-colors duration-150 ease-out hover:bg-emerald-50">

                        <CheckIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                    type="button"
                    onClick={() => cancelOne(field.label)}
                    aria-label={`Cancel editing ${field.label}`}
                    className="shrink-0 rounded p-1 text-gray-400 transition-colors duration-150 ease-out hover:bg-gray-100">

                        <XIcon className="h-3.5 w-3.5" />
                      </button>
                    </>
                }
                </div> :

              <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-gray-800">
                    {values[field.label]}
                  </p>
                  <button
                  type="button"
                  onClick={() => startEditOne(field.label)}
                  aria-label={`Edit ${field.label}`}
                  className="shrink-0 rounded p-1 text-gray-400 transition-colors duration-150 ease-out hover:bg-navy-50 hover:text-navy-700">

                    <PencilIcon className="h-3 w-3" />
                  </button>
                </div>
              }
            </li>);

        })}
      </ul>
    </Panel>);

}
