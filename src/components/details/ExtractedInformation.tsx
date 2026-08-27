import { useEffect, useState } from 'react';
import { CheckCircleIcon, AlertTriangleIcon, PencilIcon, CheckIcon, XIcon } from 'lucide-react';
import { ExtractedField } from '../../types';
import { Panel } from '../ui/Panel';
import { Tooltip } from '../ui/Tooltip';

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
      bodyClassName="p-4">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map((field) => {
          const good = field.confidence >= 90;
          const isEditing = editingAll || editingLabel === field.label;
          return (
            <div key={field.label} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-[12px] font-medium text-navy-600">{field.label}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <span className={`text-[11px] font-bold ${confidenceTone(field.confidence)}`}>
                    {field.confidence}%
                  </span>
                  {good ?
                  <CheckCircleIcon className="h-4 w-4 text-emerald-500" aria-label="High confidence" /> :

                  <AlertTriangleIcon className="h-4 w-4 text-amber-500" aria-label="Needs review" />
                  }
                </div>
              </div>

              {isEditing ?
              <div className="flex items-center gap-1">
                  <input
                  autoFocus={!editingAll}
                  value={drafts[field.label] ?? values[field.label]}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [field.label]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') editingAll ? saveAll() : saveOne(field.label);
                    if (e.key === 'Escape') editingAll ? cancelAll() : cancelOne(field.label);
                  }}
                  className="w-full rounded border border-navy-300 px-2 py-1.5 text-[13px] font-semibold text-gray-800 outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-100" />

                  {!editingAll &&
                <>
                      <button
                    type="button"
                    onClick={() => saveOne(field.label)}
                    aria-label={`Save ${field.label}`}
                    className="shrink-0 rounded p-1.5 text-emerald-600 transition-colors duration-150 ease-out hover:bg-emerald-50">

                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                    type="button"
                    onClick={() => cancelOne(field.label)}
                    aria-label={`Cancel editing ${field.label}`}
                    className="shrink-0 rounded p-1.5 text-gray-400 transition-colors duration-150 ease-out hover:bg-gray-100">

                        <XIcon className="h-4 w-4" />
                      </button>
                    </>
                }
                </div> :

              <div className="flex items-center justify-between gap-2">
                  <Tooltip content={values[field.label]} className="block overflow-hidden min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-gray-900">
                      {values[field.label]}
                    </p>
                  </Tooltip>
                  <button
                  type="button"
                  onClick={() => startEditOne(field.label)}
                  aria-label={`Edit ${field.label}`}
                  className="shrink-0 rounded p-1.5 text-gray-400 transition-colors duration-150 ease-out hover:bg-navy-50 hover:text-navy-700">

                    <PencilIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              }
            </div>);

        })}
      </div>
    </Panel>);

}
