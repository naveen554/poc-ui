import { ReactNode, useMemo, useState } from 'react';
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  ClockIcon,
  DatabaseIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  InfoIcon,
  PlugZapIcon,
  RefreshCwIcon,
  SearchIcon,
  UploadCloudIcon } from
'lucide-react';
import { ManualReviewDrawer } from '../components/harness/ManualReviewDrawer';
import { Toast, ToastType } from '../components/ui/Toast';
import {
  manualReviewRecords,
  reviewQuestionGroups,
  systemFeeds } from
'../data/dataHarness';
import {
  ManualReviewRecord,
  ReviewOutcome,
  ReviewStatus,
  SystemFeedStatus } from
'../types';

type HarnessTab = 'manual' | 'systems';

const statusTone: Record<ReviewStatus, string> = {
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  'In Review': 'border-blue-200 bg-blue-50 text-blue-700',
  Submitted: 'border-emerald-200 bg-emerald-50 text-emerald-700'
};

const outcomeTone: Record<ReviewOutcome, string> = {
  'Not Started': 'border-gray-200 bg-gray-100 text-gray-600',
  'No Issue': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Issue: 'border-red-200 bg-red-50 text-red-700'
};

const feedTone: Record<SystemFeedStatus, string> = {
  Connected: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Degraded: 'border-amber-200 bg-amber-50 text-amber-700',
  Manual: 'border-blue-200 bg-blue-50 text-blue-700',
  Offline: 'border-red-200 bg-red-50 text-red-700'
};

function SummaryCard({
  label,
  value,
  hint,
  icon,
  tone




}: {label: string;value: string;hint: string;icon: ReactNode;tone: string;}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${tone}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-2xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-[17px] font-semibold leading-tight text-navy-800">{value}</p>
        <p className="truncate text-2xs text-gray-500">{hint}</p>
      </div>
    </div>);

}

export function DataHarnessPage() {
  const [tab, setTab] = useState<HarnessTab>('manual');
  const [records, setRecords] = useState<ManualReviewRecord[]>(manualReviewRecords);
  const [query, setQuery] = useState('');
  const [lob, setLob] = useState('All');
  const [quarter, setQuarter] = useState('All');
  const [status, setStatus] = useState<'All' | ReviewStatus>('All');
  const [activeRecord, setActiveRecord] = useState<ManualReviewRecord | null>(null);
  const [toast, setToast] = useState<{message: string;type: ToastType;} | null>(null);

  const lobOptions = useMemo(
    () => ['All', ...Array.from(new Set(records.map((r) => r.lob)))],
    [records]
  );
  const quarterOptions = useMemo(
    () => ['All', ...Array.from(new Set(records.map((r) => r.quarter)))],
    [records]
  );

  const visibleRecords = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((record) => {
      if (lob !== 'All' && record.lob !== lob) return false;
      if (quarter !== 'All' && record.quarter !== quarter) return false;
      if (status !== 'All' && record.reviewStatus !== status) return false;
      if (!q) return true;
      return [
      record.id,
      record.policyNumber,
      record.groupName,
      record.employeeName,
      record.leaveManager,
      record.leaveId].
      join(' ').toLowerCase().includes(q);
    });
  }, [records, query, lob, quarter, status]);

  const counts = useMemo(() => {
    const submitted = records.filter((r) => r.reviewStatus === 'Submitted');
    const issues = records.filter((r) => r.outcome === 'Issue');
    const passRate = submitted.length ?
    Math.round(submitted.filter((r) => r.outcome === 'No Issue').length / submitted.length * 100) :
    0;
    return {
      pending: records.filter((r) => r.reviewStatus === 'Pending').length,
      inReview: records.filter((r) => r.reviewStatus === 'In Review').length,
      submitted: submitted.length,
      issues: issues.length,
      passRate
    };
  }, [records]);

  const handleSubmitReview = (recordId: string, hasIssue: boolean, findings: number) => {
    const outcome: ReviewOutcome = hasIssue ? 'Issue' : 'No Issue';
    setRecords((prev) =>
    prev.map((record) =>
    record.id === recordId ?
    {
      ...record,
      reviewStatus: 'Submitted' as ReviewStatus,
      outcome,
      openFindings: findings
    } :
    record
    )
    );
    setActiveRecord(null);
    setToast({ message: `Review ${recordId} submitted`, type: 'success' });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-4">
      <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
        <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <p className="text-[12.5px] leading-relaxed text-blue-900">
          <span className="font-semibold">Placeholder for the POC.</span> Data Harness is where operational
          data is collected from source systems and combined with manual quality reviews entered by the team.
          The screens below illustrate the intended workflow — no data is saved.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Awaiting Review"
          value={String(counts.pending)}
          hint="Leaves sampled and queued"
          icon={<ClipboardListIcon className="h-4 w-4" />}
          tone="bg-amber-50 text-amber-600" />

        <SummaryCard
          label="In Review"
          value={String(counts.inReview)}
          hint="Currently with an auditor"
          icon={<ClockIcon className="h-4 w-4" />}
          tone="bg-blue-50 text-blue-600" />

        <SummaryCard
          label="Issues Found"
          value={String(counts.issues)}
          hint="Findings requiring remediation"
          icon={<AlertTriangleIcon className="h-4 w-4" />}
          tone="bg-red-50 text-red-600" />

        <SummaryCard
          label="Clean Rate"
          value={`${counts.passRate}%`}
          hint={`${counts.submitted} reviews submitted`}
          icon={<CheckCircle2Icon className="h-4 w-4" />}
          tone="bg-emerald-50 text-emerald-600" />

      </div>

      <div className="flex items-center gap-2" role="tablist" aria-label="Data harness sections">
        {([
        { key: 'manual', label: 'Manual Reviews', icon: ClipboardListIcon, count: records.length },
        { key: 'systems', label: 'System Feeds', icon: DatabaseIcon, count: systemFeeds.length }] as const).
        map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-[13px] font-medium transition-all duration-150 ease-out ${
              active ?
              'border-navy-700 bg-navy-700 text-white' :
              'border-gray-200 bg-white text-gray-600 hover:bg-navy-50 hover:text-navy-700'}`
              }>

              <Icon className="h-3.5 w-3.5" />
              {t.label}
              <span className={active ? 'font-bold' : 'font-semibold'}>({t.count})</span>
            </button>);

        })}
      </div>

      {tab === 'manual' ?
      <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-3 py-2.5">
            <label className="relative w-[280px]">
              <span className="sr-only">Search reviews</span>
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employee, group, policy or leave ID..."
              className="h-8 w-full rounded border border-gray-300 pl-8 pr-2 text-[12.5px] text-gray-700 outline-none transition-colors duration-150 ease-out placeholder:text-gray-400 focus:border-navy-700" />

            </label>

            <select
            value={lob}
            onChange={(e) => setLob(e.target.value)}
            aria-label="Filter by line of business"
            className="h-8 rounded border border-gray-300 px-2 text-[12.5px] text-gray-700 outline-none focus:border-navy-700">

              {lobOptions.map((opt) =>
            <option key={opt} value={opt}>
                  {opt === 'All' ? 'All LOB' : opt}
                </option>
            )}
            </select>

            <select
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            aria-label="Filter by quarter"
            className="h-8 rounded border border-gray-300 px-2 text-[12.5px] text-gray-700 outline-none focus:border-navy-700">

              {quarterOptions.map((opt) =>
            <option key={opt} value={opt}>
                  {opt === 'All' ? 'All Quarters' : opt}
                </option>
            )}
            </select>

            <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'All' | ReviewStatus)}
            aria-label="Filter by review status"
            className="h-8 rounded border border-gray-300 px-2 text-[12.5px] text-gray-700 outline-none focus:border-navy-700">

              {['All', 'Pending', 'In Review', 'Submitted'].map((opt) =>
            <option key={opt} value={opt}>
                  {opt === 'All' ? 'All Statuses' : opt}
                </option>
            )}
            </select>

            <div className="ml-auto flex items-center gap-2">
              <button
              type="button"
              onClick={() => setToast({ message: 'Export queued (placeholder)', type: 'success' })}
              className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-gray-700 transition-colors duration-150 ease-out hover:bg-gray-50">

                <DownloadIcon className="h-3.5 w-3.5" />
                Export
              </button>
              <button
              type="button"
              onClick={() => setToast({ message: 'Sample refreshed (placeholder)', type: 'success' })}
              className="rounded bg-navy-700 p-1.5 text-white transition-colors duration-150 ease-out hover:bg-navy-800"
              aria-label="Refresh review queue">

                <RefreshCwIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {[
                'LOB',
                'Quarter',
                'Policy Number',
                'Group Name',
                'Leave Manager',
                'Employee Name',
                'Leave ID',
                'Auditor',
                'Date Reviewed',
                'Outcome',
                'Status',
                ''].
                map((col, i) =>
                <th
                  key={`${col}-${i}`}
                  scope="col"
                  className="whitespace-nowrap px-3 py-2 text-[11.5px] font-semibold text-gray-600">

                      {col}
                    </th>
                )}
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((record) =>
              <tr
                key={record.id}
                className="border-b border-gray-100 transition-colors duration-150 ease-out last:border-b-0 hover:bg-navy-50/60">

                    <td className="whitespace-nowrap px-3 py-2 text-[12px] font-medium text-gray-700">{record.lob}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-[12px] text-gray-600">{record.quarter}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-[12px] font-medium text-navy-700">
                      {record.policyNumber}
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-2 text-[12px] text-gray-700" title={record.groupName}>
                      {record.groupName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[12px] text-gray-600">{record.leaveManager}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-[12px] text-gray-800">{record.employeeName}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11.5px] text-gray-500">
                      {record.leaveId}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[12px] text-gray-600">{record.auditorInitials}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-[12px] text-gray-600">{record.dateReviewed}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium ${
                    outcomeTone[record.outcome]}`
                    }>

                        {record.outcome}
                        {record.openFindings > 0 ? ` (${record.openFindings})` : ''}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-2xs font-medium ${
                    statusTone[record.reviewStatus]}`
                    }>

                        {record.reviewStatus}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button
                    type="button"
                    onClick={() => setActiveRecord(record)}
                    className="rounded border border-navy-100 bg-navy-50 px-2.5 py-1 text-2xs font-semibold text-navy-700 transition-colors duration-150 ease-out hover:bg-navy-100">

                        {record.reviewStatus === 'Submitted' ? 'View' : 'Review'}
                      </button>
                    </td>
                  </tr>
              )}
                {visibleRecords.length === 0 &&
              <tr>
                    <td colSpan={12} className="px-3 py-10 text-center text-[12.5px] text-gray-500">
                      No reviews match the current filters.
                    </td>
                  </tr>
              }
              </tbody>
            </table>
          </div>
        </section> :

      <div className="flex flex-col gap-3">
          <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
            <header className="flex h-9 items-center gap-2 bg-navy-700 px-3 text-white">
              <PlugZapIcon className="h-3.5 w-3.5" />
              <h2 className="text-[13px] font-semibold">Connected Sources</h2>
              <span className="ml-auto text-2xs text-white/70">Placeholder — connection details are illustrative</span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {['Source System', 'Collection Method', 'Cadence', 'Last Sync', 'Records', 'Coverage', 'Status', ''].
                  map((col, i) =>
                  <th
                    key={`${col}-${i}`}
                    scope="col"
                    className="whitespace-nowrap px-3 py-2 text-[11.5px] font-semibold text-gray-600">

                          {col}
                        </th>
                  )}
                  </tr>
                </thead>
                <tbody>
                  {systemFeeds.map((feed) =>
                <tr key={feed.id} className="border-b border-gray-100 last:border-b-0 hover:bg-navy-50/60">
                      <td className="px-3 py-2.5">
                        <p className="text-[12.5px] font-medium text-gray-800">{feed.name}</p>
                        <p className="text-2xs text-gray-500">{feed.description}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-gray-600">{feed.method}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-gray-600">{feed.cadence}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-gray-600">{feed.lastSync}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[12px] font-medium text-navy-800">
                        {feed.records}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
                            <div
                          className={`h-full rounded-full ${
                          feed.coverage >= 90 ?
                          'bg-emerald-500' :
                          feed.coverage >= 75 ?
                          'bg-amber-500' :
                          'bg-red-500'}`
                          }
                          style={{ width: `${feed.coverage}%` }} />

                          </div>
                          <span className="text-2xs font-medium text-gray-600">{feed.coverage}%</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-2xs font-medium ${
                      feedTone[feed.status]}`
                      }>

                          {feed.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        <button
                      type="button"
                      onClick={() =>
                      setToast({ message: `${feed.name} sync started (placeholder)`, type: 'success' })
                      }
                      className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1 text-2xs font-semibold text-gray-700 transition-colors duration-150 ease-out hover:bg-gray-50">

                          <RefreshCwIcon className="h-3 w-3" />
                          Sync
                        </button>
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <section className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-5 text-center shadow-sm">
              <UploadCloudIcon className="mx-auto h-7 w-7 text-navy-700" />
              <p className="mt-2 text-[13px] font-semibold text-navy-800">Upload an audit workbook</p>
              <p className="mx-auto mt-1 max-w-md text-2xs text-gray-500">
                Drop the quarterly Excel audit tabs here to backfill historical manual reviews. Columns are mapped
                to the review questions automatically.
              </p>
              <button
              type="button"
              onClick={() => setToast({ message: 'Upload is a placeholder in this POC', type: 'success' })}
              className="mt-3 inline-flex items-center gap-1.5 rounded bg-navy-700 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors duration-150 ease-out hover:bg-navy-800">

                <FileSpreadsheetIcon className="h-3.5 w-3.5" />
                Select file
              </button>
            </section>

            <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
              <header className="flex h-9 items-center gap-2 bg-navy-700 px-3 text-white">
                <DatabaseIcon className="h-3.5 w-3.5" />
                <h2 className="text-[13px] font-semibold">How the harness works</h2>
              </header>
              <ol className="flex flex-col gap-2.5 px-4 py-3">
                {[
              'Sampling engine selects leaves per policy, quarter and LOB.',
              'Automated feeds pull dates, letters and payments from source systems.',
              'Auditors answer the manual review questions for anything a system cannot prove.',
              'Scored results feed the performance guarantee calculations and Insights & Metrics.'].
              map((step, i) =>
              <li key={step} className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-50 text-2xs font-semibold text-navy-700">
                      {i + 1}
                    </span>
                    <p className="text-[12.5px] leading-relaxed text-gray-700">{step}</p>
                  </li>
              )}
              </ol>
            </section>
          </div>
        </div>
      }

      <ManualReviewDrawer
        open={Boolean(activeRecord)}
        record={activeRecord}
        groups={reviewQuestionGroups}
        onClose={() => setActiveRecord(null)}
        onSubmit={handleSubmitReview} />


      {toast &&
      <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      }
    </div>);

}
