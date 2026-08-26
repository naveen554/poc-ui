import React from 'react';
import {
  FileTextIcon,
  ShieldCheckIcon,
  GaugeIcon,
  GitBranchIcon,
  ActivityIcon,
  ClockIcon } from
'lucide-react';
import { FileDetail } from '../../types';

function Cell({
  icon,
  title,
  children




}: {icon: React.ReactNode;title: string;children: React.ReactNode;}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 border-r border-gray-100 px-4 py-3 last:border-r-0">
      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-navy-700">
        {icon}
        <span className="truncate">{title}</span>
      </div>
      {children}
    </div>);

}

function Meter({ value, tone }: {value: number;tone: string;}) {
  return (
    <div className="h-1 w-full rounded-full bg-gray-100">
      <div className={`h-1 rounded-full ${tone}`} style={{ width: `${value}%` }} />
    </div>);

}

export function MetricsBar({ detail }: {detail: FileDetail;}) {
  const m = detail.metrics;
  return (
    <div className="flex flex-wrap items-stretch rounded-md border border-gray-200 bg-white shadow-sm">
      <Cell icon={<FileTextIcon className="h-3.5 w-3.5" />} title="File Details">
        <dl className="space-y-1.5">
          <div>
            <dt className="text-2xs text-gray-400">Uploaded</dt>
            <dd className="text-[12px] text-gray-700">{detail.uploadedAt}</dd>
          </div>
          <div>
            <dt className="text-2xs text-gray-400">Processed</dt>
            <dd className="text-[12px] text-gray-700">{detail.processedAt}</dd>
          </div>
        </dl>
      </Cell>

      <Cell icon={<ShieldCheckIcon className="h-3.5 w-3.5" />} title="Overall Confidence">
        <p className="text-[28px] font-bold leading-8 text-navy-800">{m.overallConfidence}%</p>
        <p className="text-2xs text-gray-400">Document Quality</p>
      </Cell>

      <Cell icon={<GaugeIcon className="h-3.5 w-3.5" />} title="Confidence Score">
        <p className="text-[28px] font-bold leading-8 text-navy-800">{m.confidenceScore.toFixed(2)}</p>
        <p className="text-2xs text-gray-400">Type Detection</p>
      </Cell>

      <Cell icon={<GitBranchIcon className="h-3.5 w-3.5" />} title="Routing Decision">
        <p className="text-[22px] font-bold leading-8 text-navy-800">{m.routingDecision}</p>
        <p className="truncate text-2xs text-gray-400">{m.routingContext}</p>
      </Cell>

      <Cell icon={<ActivityIcon className="h-3.5 w-3.5" />} title="Extraction">
        <p className="text-[28px] font-bold leading-8 text-navy-800">{m.extraction}%</p>
        <Meter value={m.extraction} tone={m.extraction >= 80 ? 'bg-amber-500' : 'bg-red-500'} />
        <p className="text-2xs text-gray-400">{m.extractionLabel}</p>
      </Cell>

      <Cell icon={<ClockIcon className="h-3.5 w-3.5" />} title="Completeness">
        <p className="text-[28px] font-bold leading-8 text-navy-800">{m.completeness}%</p>
        <Meter value={m.completeness} tone={m.completeness >= 80 ? 'bg-emerald-500' : 'bg-amber-500'} />
        <p className="text-2xs text-gray-400">{m.completenessLabel}</p>
      </Cell>
    </div>);

}