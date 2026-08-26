import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis } from
'recharts';
import { Panel } from '../components/ui/Panel';
import { KpiCard } from '../components/reports/KpiCard';
import { exposureByClient, pgBreakdown, riskIndicators, kpis, topRiskAccounts } from '../data/reports';

const pieColors = ['#1F3B73', '#3B82F6', '#93C5FD'];
const riskTone: Record<string, string> = {
  High: 'border-red-200 bg-red-50 text-red-600',
  Medium: 'border-amber-200 bg-amber-50 text-amber-700',
  Low: 'border-emerald-200 bg-emerald-50 text-emerald-700'
};

const axisProps = { tick: { fontSize: 11, fill: '#6B7280' }, stroke: '#D1D5DB' };

export function ReportsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) =>
        <KpiCard key={kpi.label} {...kpi} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Exposure by Client" bodyClassName="p-3">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exposureByClient} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="client" interval={0} height={48} angle={-18} textAnchor="end" {...axisProps} />
                <YAxis unit="M" {...axisProps} />
                <Tooltip
                  formatter={(value: number) => [`$${value}M`, 'Exposure']}
                  contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#E5E7EB' }} />
                
                <Bar dataKey="exposure" fill="#1F3B73" radius={[3, 3, 0, 0]} barSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Standard vs. Custom PG Breakdown" bodyClassName="p-3">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pgBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={2}>
                  
                  {pgBreakdown.map((entry, index) =>
                  <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                  )}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} policies`, name]}
                  contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#E5E7EB' }} />
                
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel title="Risk Indicators" bodyClassName="p-3">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskIndicators} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#E5E7EB' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Bar dataKey="high" name="High risk" stackId="r" fill="#DC2626" barSize={30} />
                <Bar dataKey="medium" name="Medium risk" stackId="r" fill="#F59E0B" barSize={30} />
                <Bar dataKey="low" name="Low risk" stackId="r" fill="#1F3B73" radius={[3, 3, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Highest Exposure Accounts" bodyClassName="p-0">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['Client', 'Policy No', 'Exposure', 'PG Type', 'Risk'].map((col) =>
                <th key={col} scope="col" className="px-3 py-2 text-[11.5px] font-semibold text-gray-600">
                    {col}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {topRiskAccounts.map((row) =>
              <tr key={row.policy} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-3 py-2.5 text-[12px] font-medium text-gray-800">{row.client}</td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-600">{row.policy}</td>
                  <td className="px-3 py-2.5 text-[12px] font-semibold text-navy-800">{row.exposure}</td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-600">{row.pg}</td>
                  <td className="px-3 py-2.5">
                    <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-2xs font-medium ${riskTone[row.risk]}`}>
                    
                      {row.risk}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>);

}