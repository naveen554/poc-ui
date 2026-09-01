import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  MinusCircleIcon,
  SparklesIcon } from
'lucide-react';
import { Drawer } from '../ui/Drawer';
import {
  ManualReviewRecord,
  ReviewAnswer,
  ReviewQuestionGroup,
  ReviewResponse } from
'../../types';

interface ManualReviewDrawerProps {
  open: boolean;
  record: ManualReviewRecord | null;
  groups: ReviewQuestionGroup[];
  onClose: () => void;
  onSubmit: (recordId: string, hasIssue: boolean, findings: number) => void;
}

const answerOptions: {value: ReviewAnswer;icon: typeof CheckCircle2Icon;active: string;idle: string;}[] = [
{
  value: 'No Issue',
  icon: CheckCircle2Icon,
  active: 'border-emerald-500 bg-emerald-500 text-white',
  idle: 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-emerald-50'
},
{
  value: 'Issue',
  icon: AlertTriangleIcon,
  active: 'border-red-500 bg-red-500 text-white',
  idle: 'border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:bg-red-50'
},
{
  value: 'N/A',
  icon: MinusCircleIcon,
  active: 'border-gray-500 bg-gray-500 text-white',
  idle: 'border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50'
}];


function ContextField({ label, value }: {label: string;value: string;}) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="truncate text-[12.5px] font-medium text-gray-800" title={value}>
        {value}
      </dd>
    </div>);

}

export function ManualReviewDrawer({ open, record, groups, onClose, onSubmit }: ManualReviewDrawerProps) {
  const [responses, setResponses] = useState<Record<string, ReviewResponse>>({});
  const [autoFill, setAutoFill] = useState(false);

  const allQuestions = useMemo(
    () => groups.flatMap((group) => group.questions.map((q) => q.id)),
    [groups]
  );

  useEffect(() => {
    if (!open || !record) return;
    const seed: Record<string, ReviewResponse> = {};
    allQuestions.forEach((id) => {
      seed[id] = { answer: record.autoFillNoIssue ? 'No Issue' : null, comment: '' };
    });
    setResponses(seed);
    setAutoFill(record.autoFillNoIssue);
  }, [open, record, allQuestions]);

  const answeredCount = allQuestions.filter((id) => responses[id]?.answer).length;
  const issueCount = allQuestions.filter((id) => responses[id]?.answer === 'Issue').length;
  const progress = allQuestions.length ? Math.round(answeredCount / allQuestions.length * 100) : 0;
  const complete = answeredCount === allQuestions.length && allQuestions.length > 0;

  const setAnswer = (questionId: string, answer: ReviewAnswer) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { answer, comment: prev[questionId]?.comment ?? '' }
    }));
  };

  const setComment = (questionId: string, comment: string) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { answer: prev[questionId]?.answer ?? null, comment }
    }));
  };

  const handleAutoFill = (checked: boolean) => {
    setAutoFill(checked);
    if (!checked) return;
    setResponses((prev) => {
      const next = { ...prev };
      allQuestions.forEach((id) => {
        if (!next[id]?.answer) {
          next[id] = { answer: 'No Issue', comment: next[id]?.comment ?? '' };
        }
      });
      return next;
    });
  };

  if (!record) return null;

  return (
    <Drawer open={open} onClose={onClose} title={`Manual Review · ${record.id}`} width="w-[720px]">
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <section className="border-b border-gray-200 bg-navy-50 px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-navy-800">
                Review Context
              </h3>
              <span className="rounded-full border border-navy-100 bg-white px-2 py-0.5 text-2xs font-medium text-navy-700">
                Sourced from Leave Management System
              </span>
            </div>
            <dl className="grid grid-cols-3 gap-x-4 gap-y-2.5">
              <ContextField label="LOB" value={record.lob} />
              <ContextField label="Quarter" value={record.quarter} />
              <ContextField label="Policy Number" value={record.policyNumber} />
              <ContextField label="Group Name" value={record.groupName} />
              <ContextField label="Auditor Initials" value={record.auditorInitials} />
              <ContextField label="Date Reviewed" value={record.dateReviewed} />
              <ContextField label="Leave Manager" value={record.leaveManager} />
              <ContextField label="Employee Name" value={record.employeeName} />
              <ContextField label="Leave ID" value={record.leaveId} />
              <ContextField label="Prelim. Email to FML Teams" value={record.prelimEmailDate} />
            </dl>
          </section>

          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={autoFill}
                onChange={(e) => handleAutoFill(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-navy-700 focus:ring-navy-700" />

              <span className="flex items-center gap-1 text-[12.5px] font-medium text-gray-700">
                <SparklesIcon className="h-3.5 w-3.5 text-amber-500" />
                Auto-fill &quot;No Issue&quot;
              </span>
            </label>

            <div className="ml-auto flex items-center gap-2">
              {issueCount > 0 &&
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-2xs font-medium text-red-700">
                  {issueCount} issue{issueCount > 1 ? 's' : ''} flagged
                </span>
              }
              <span className="text-2xs font-medium text-gray-500">
                {answeredCount}/{allQuestions.length} answered
              </span>
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 ease-out ${
                  complete ? 'bg-emerald-500' : 'bg-navy-700'}`
                  }
                  style={{ width: `${progress}%` }} />

              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 px-4 py-3">
            {groups.map((group, index) => {
              const groupIssues = group.questions.filter(
                (q) => responses[q.id]?.answer === 'Issue'
              ).length;

              return (
                <section
                  key={group.id}
                  className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">

                  <header className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-700 text-2xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="truncate text-[13px] font-semibold text-navy-800">{group.title}</h4>
                      <p className="truncate text-2xs text-gray-500">{group.standard}</p>
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-1.5">
                      {group.slaDays !== null &&
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-2xs font-medium text-blue-700">
                          <ClockIcon className="h-3 w-3" />
                          {group.slaDays} business day{group.slaDays > 1 ? 's' : ''}
                        </span>
                      }
                      {groupIssues > 0 &&
                      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-2xs font-medium text-red-700">
                          {groupIssues}
                        </span>
                      }
                    </div>
                  </header>

                  <div className="divide-y divide-gray-100">
                    {group.questions.map((question) => {
                      const response = responses[question.id];
                      const showComment = response?.answer === 'Issue' || Boolean(response?.comment);

                      return (
                        <div key={question.id} className="px-3 py-2.5">
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-[12.5px] font-medium text-gray-800">{question.label}</p>
                              {question.helper &&
                              <p className="mt-0.5 text-2xs text-gray-500">{question.helper}</p>
                              }
                            </div>
                            <div
                              className="flex shrink-0 items-center gap-1"
                              role="radiogroup"
                              aria-label={question.label}>

                              {answerOptions.map((option) => {
                                const active = response?.answer === option.value;
                                const Icon = option.icon;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    onClick={() => setAnswer(question.id, option.value)}
                                    className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-2xs font-medium transition-all duration-150 ease-out ${
                                    active ? option.active : option.idle}`
                                    }>

                                    <Icon className="h-3 w-3" />
                                    {option.value}
                                  </button>);

                              })}
                            </div>
                          </div>

                          {showComment &&
                          <textarea
                            value={response?.comment ?? ''}
                            onChange={(e) => setComment(question.id, e.target.value)}
                            rows={2}
                            placeholder="Comment — describe the finding, root cause and remediation"
                            className="mt-2 w-full rounded border border-gray-300 px-2 py-1.5 text-[12px] text-gray-700 outline-none transition-colors duration-150 ease-out placeholder:text-gray-400 focus:border-navy-700" />

                          }
                        </div>);

                    })}
                  </div>
                </section>);

            })}

            <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
              <header className="border-b border-gray-100 bg-gray-50 px-3 py-2">
                <h4 className="text-[13px] font-semibold text-navy-800">Auditor Summary</h4>
              </header>
              <div className="px-3 py-2.5">
                <textarea
                  rows={3}
                  placeholder="Overall observations, coaching notes and follow-up actions for the leave manager..."
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-[12px] text-gray-700 outline-none transition-colors duration-150 ease-out placeholder:text-gray-400 focus:border-navy-700" />

              </div>
            </section>
          </div>
        </div>

        <footer className="flex shrink-0 items-center gap-2 border-t border-gray-200 bg-white px-4 py-2.5">
          <p className="text-2xs text-gray-500">
            Placeholder form for the POC — responses are not persisted.
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-gray-700 transition-colors duration-150 ease-out hover:bg-gray-50">

              Save Draft
            </button>
            <button
              type="button"
              disabled={!complete}
              onClick={() => onSubmit(record.id, issueCount > 0, issueCount)}
              className="rounded bg-navy-700 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors duration-150 ease-out hover:bg-navy-800 disabled:cursor-not-allowed disabled:bg-gray-300">

              Submit Review
            </button>
          </div>
        </footer>
      </div>
    </Drawer>);

}
