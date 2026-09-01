import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangleIcon,
  BriefcaseIcon,
  BuildingIcon,
  CalendarIcon,
  DollarSignIcon,
  FileTextIcon,
  GaugeIcon,
  InfoIcon,
  LayersIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  UsersIcon,
} from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { Loader } from '../components/ui/Loader';
import {
  getBrokerPortfolio,
  getContractPortfolio,
  getExecutiveOverview,
  getOperationsReport,
  getPGAnalysis,
  getPolicyPortfolio,
  getProductPortfolio,
  type BrokerPortfolio,
  type ContractPortfolio,
  type ExecutiveOverview,
  type OperationsReport,
  type PGAnalysis,
  type PolicyPortfolio,
  type ProductPortfolio,
} from '../services/api';

type DashboardTab =
  | 'overview'
  | 'contracts'
  | 'policies'
  | 'pgs'
  | 'products'
  | 'brokers'
  | 'operations';

const chartPalette = ['#1F3B73', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'];
const axisProps = { tick: { fontSize: 11, fill: '#64748B' }, stroke: '#E2E8F0' };
const tooltipStyle = {
  fontSize: 12,
  borderRadius: 6,
  borderColor: '#E5E7EB',
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
};

function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return '$0';
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function SummaryCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${tone}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-2xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-[17px] font-semibold leading-tight text-navy-800">{value}</p>
        <p className="truncate text-2xs text-gray-500">{hint}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone = 'text-navy-800' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded border border-gray-100 bg-gray-50/60 px-3 py-2">
      <p className="text-2xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-0.5 text-[15px] font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const tone =
    normalized === 'PARTIALLY_REVIEWED'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : normalized === 'PENDING_REVIEW' || normalized === 'PENDING'
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : normalized === 'COMPLETED' || normalized === 'APPROVED' || normalized === 'SIGNED'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : normalized === 'UNSIGNED'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-gray-200 bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-2xs font-medium ${tone}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function ReportsPage() {
  const [tab, setTab] = useState<DashboardTab>('overview');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<ExecutiveOverview | null>(null);
  const [contracts, setContracts] = useState<ContractPortfolio | null>(null);
  const [policies, setPolicies] = useState<PolicyPortfolio | null>(null);
  const [pgs, setPgs] = useState<PGAnalysis | null>(null);
  const [products, setProducts] = useState<ProductPortfolio | null>(null);
  const [brokers, setBrokers] = useState<BrokerPortfolio | null>(null);
  const [operations, setOperations] = useState<OperationsReport | null>(null);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, contractsData, policiesData, pgsData, productsData, brokersData, opsData] =
        await Promise.all([
          getExecutiveOverview(dateFrom || undefined, dateTo || undefined),
          getContractPortfolio(),
          getPolicyPortfolio(),
          getPGAnalysis(),
          getProductPortfolio(),
          getBrokerPortfolio(),
          getOperationsReport(),
        ]);

      setOverview(overviewData);
      setContracts(contractsData);
      setPolicies(policiesData);
      setPgs(pgsData);
      setProducts(productsData);
      setBrokers(brokersData);
      setOperations(opsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [dateFrom, dateTo]);

  const tabs = [
    { key: 'overview' as const, label: 'Executive Overview', icon: GaugeIcon },
    { key: 'contracts' as const, label: 'Contracts', icon: FileTextIcon },
    { key: 'policies' as const, label: 'Policies', icon: LayersIcon },
    { key: 'pgs' as const, label: 'PG Analysis', icon: AlertTriangleIcon },
    { key: 'products' as const, label: 'Products', icon: DollarSignIcon },
    { key: 'brokers' as const, label: 'Brokers', icon: BriefcaseIcon },
    { key: 'operations' as const, label: 'Operations', icon: CalendarIcon },
  ];

  const overviewData = overview?.data;

  const contractsByBroker = useMemo(() => {
    if (!contracts) return [];
    const grouped = new Map<string, { broker: string; contracts: number; total_pgs: number }>();
    contracts.items.forEach((c) => {
      const key = c.broker_producer || 'Direct';
      const existing = grouped.get(key);
      if (existing) {
        existing.contracts += 1;
        existing.total_pgs += c.total_pgs;
      } else {
        grouped.set(key, { broker: key, contracts: 1, total_pgs: c.total_pgs });
      }
    });
    return Array.from(grouped.values());
  }, [contracts]);

  const policiesByProduct = useMemo(() => {
    if (!policies) return [];
    const grouped = new Map<string, { product: string; policies: number; pgs: number }>();
    policies.items.forEach((p) => {
      const key = p.product_line || 'Unassigned';
      const existing = grouped.get(key);
      if (existing) {
        existing.policies += 1;
        existing.pgs += p.applicable_pgs;
      } else {
        grouped.set(key, { product: key, policies: 1, pgs: p.applicable_pgs });
      }
    });
    return Array.from(grouped.values()).sort((a, b) => b.policies - a.policies);
  }, [policies]);

  const pgsByCategory = useMemo(() => {
    if (!pgs) return [];
    const grouped = new Map<
      string,
      { category: string; total: number; non_standard: number; attention: number }
    >();
    pgs.items.forEach((p) => {
      const existing = grouped.get(p.pg_category);
      if (existing) {
        existing.total += p.total_pgs;
        existing.non_standard += p.non_standard_pgs;
        existing.attention += p.attention_pgs;
      } else {
        grouped.set(p.pg_category, {
          category: p.pg_category,
          total: p.total_pgs,
          non_standard: p.non_standard_pgs,
          attention: p.attention_pgs,
        });
      }
    });
    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }, [pgs]);

  const reviewByStatus = useMemo(() => {
    if (!operations) return [];
    const grouped = new Map<string, number>();
    operations.data.review_workload.forEach((w) => {
      grouped.set(w.status, (grouped.get(w.status) ?? 0) + w.items);
    });
    return Array.from(grouped.entries()).map(([status, items]) => ({ status, items }));
  }, [operations]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-4">
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <p className="truncate text-[12.5px] leading-relaxed text-blue-900">
            <span className="font-semibold">Portfolio insights.</span> Filter by upload date to scope the executive overview.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <label className="text-2xs font-medium uppercase tracking-wide text-gray-600">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-7 rounded border border-gray-300 bg-white px-2 text-[12px] text-gray-800 focus:border-navy-600 focus:outline-none"
          />
          <label className="text-2xs font-medium uppercase tracking-wide text-gray-600">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-7 rounded border border-gray-300 bg-white px-2 text-[12px] text-gray-800 focus:border-navy-600 focus:outline-none"
          />
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="text-[12px] font-medium text-blue-700 hover:text-blue-900"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={loadDashboardData}
            className="inline-flex h-7 items-center gap-1 rounded border border-gray-300 bg-white px-2 text-[12px] font-medium text-gray-700 hover:bg-gray-50"
            aria-label="Refresh"
          >
            <RefreshCwIcon className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {overviewData && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Total Contracts"
            value={String(overviewData.total_contracts)}
            hint={`${overviewData.total_clients} clients · ${overviewData.total_brokers} brokers`}
            icon={<FileTextIcon className="h-4 w-4" />}
            tone="bg-navy-50 text-navy-700"
          />
          <SummaryCard
            label="Total PGs"
            value={String(overviewData.total_pgs)}
            hint={`${overviewData.standard_pgs} standard · ${overviewData.non_standard_pgs} non-standard`}
            icon={<TrendingUpIcon className="h-4 w-4" />}
            tone="bg-blue-50 text-blue-700"
          />
          <SummaryCard
            label="Known Dollar Caps"
            value={formatCurrency(overviewData.known_dollar_caps)}
            hint={`${overviewData.uncapped_contracts} uncapped contract(s)`}
            icon={<DollarSignIcon className="h-4 w-4" />}
            tone="bg-emerald-50 text-emerald-700"
          />
          <SummaryCard
            label="Review Backlog"
            value={String(overviewData.review_backlog)}
            hint={`${overviewData.overdue_reviews} overdue · ${overviewData.unassigned_reviews} unassigned`}
            icon={<CalendarIcon className="h-4 w-4" />}
            tone="bg-amber-50 text-amber-700"
          />
          <SummaryCard
            label="Open Exceptions"
            value={String(overviewData.open_exceptions)}
            hint={`~$${parseFloat(overviewData.estimated_ai_cost_usd).toFixed(2)} AI cost`}
            icon={<AlertTriangleIcon className="h-4 w-4" />}
            tone="bg-red-50 text-red-600"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Insights sections">
        {tabs.map((t) => {
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
                active
                  ? 'border-navy-700 bg-navy-700 text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-navy-200 hover:text-navy-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
          {error}
        </div>
      )}

      {isLoading && !overview && <Loader />}

      {tab === 'overview' && overviewData && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Panel title="PG Classification Breakdown" bodyClassName="p-3">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Standard', value: overviewData.standard_pgs },
                      { name: 'Non-Standard', value: overviewData.non_standard_pgs },
                      { name: 'Custom New', value: overviewData.custom_new_pgs },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={98}
                    paddingAngle={2}
                  >
                    {chartPalette.slice(0, 3).map((c, i) => (
                      <Cell key={i} fill={c} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} PGs`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Portfolio Summary" bodyClassName="p-3">
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Policies" value={String(overviewData.total_policies)} />
              <MiniStat label="Brokers" value={String(overviewData.total_brokers)} />
              <MiniStat label="Clients" value={String(overviewData.total_clients)} tone="text-blue-700" />
              <MiniStat
                label="AI Tokens"
                value={overviewData.total_ai_tokens.toLocaleString()}
                tone="text-emerald-700"
              />
            </div>
            <div className="mt-3 rounded border border-gray-100 bg-gradient-to-br from-navy-50 to-blue-50 px-3 py-2.5">
              <p className="text-2xs font-medium uppercase tracking-wide text-gray-600">
                Estimated AI Processing Cost
              </p>
              <p className="mt-0.5 text-[22px] font-bold leading-tight text-navy-800">
                ${parseFloat(overviewData.estimated_ai_cost_usd).toFixed(2)}
              </p>
              <p className="text-2xs text-gray-500">
                Across {overviewData.total_contracts} contracts and{' '}
                {overviewData.total_ai_tokens.toLocaleString()} tokens
              </p>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'contracts' && contracts && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Panel title="Contracts by Broker" bodyClassName="p-3">
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contractsByBroker} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="broker" {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    <Bar dataKey="contracts" name="Contracts" fill="#1F3B73" radius={[3, 3, 0, 0]} barSize={30} />
                    <Bar dataKey="total_pgs" name="PGs" fill="#3B82F6" radius={[3, 3, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Validation & Risk Snapshot" bodyClassName="p-3">
              <div className="grid grid-cols-3 gap-2">
                <MiniStat
                  label="Failures"
                  value={String(contracts.items.reduce((s, c) => s + c.contract_validation_failures, 0))}
                  tone="text-red-600"
                />
                <MiniStat
                  label="Warnings"
                  value={String(contracts.items.reduce((s, c) => s + c.contract_validation_warnings, 0))}
                  tone="text-amber-600"
                />
                <MiniStat
                  label="Uncapped"
                  value={String(contracts.items.filter((c) => !c.dollar_cap).length)}
                  tone="text-navy-700"
                />
                <MiniStat
                  label="Total PGs"
                  value={String(contracts.items.reduce((s, c) => s + c.total_pgs, 0))}
                />
                <MiniStat
                  label="Non-Standard"
                  value={String(contracts.items.reduce((s, c) => s + c.non_standard_pgs, 0))}
                  tone="text-amber-700"
                />
                <MiniStat
                  label="Pending"
                  value={String(contracts.items.reduce((s, c) => s + c.pending_pgs, 0))}
                  tone="text-blue-700"
                />
              </div>
            </Panel>
          </div>

          <Panel title={`Contract Portfolio (${contracts.count})`} bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {['Client', 'Broker', 'Status', 'Signature', 'Period', 'Dollar Cap', 'PGs', 'Uploaded'].map(
                      (col) => (
                        <th
                          key={col}
                          scope="col"
                          className="px-3 py-2 text-[11.5px] font-semibold text-gray-600"
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {contracts.items.map((c) => (
                    <tr key={c.contract_id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                      <td className="px-3 py-2 text-[12px] font-medium text-gray-800">{c.client_name}</td>
                      <td className="px-3 py-2 text-[12px] text-gray-600">{c.broker_producer}</td>
                      <td className="px-3 py-2">
                        <StatusPill status={c.overall_status} />
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill status={c.signature_status} />
                      </td>
                      <td className="px-3 py-2 text-[12px] text-gray-600">
                        {c.agreement_period_start} → {c.agreement_period_end}
                      </td>
                      <td className="px-3 py-2 text-[12px] font-semibold text-navy-800">
                        {c.dollar_cap ? formatCurrency(c.dollar_cap) : '—'}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-gray-700">
                        <span className="font-semibold text-navy-800">{c.total_pgs}</span>
                        <span className="text-gray-400"> · </span>
                        <span className="text-amber-700">{c.pending_pgs} pending</span>
                      </td>
                      <td className="px-3 py-2 text-[12px] text-gray-500">
                        {new Date(c.uploaded_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'policies' && policies && (
        <div className="flex flex-col gap-3">
          <Panel title="Policies by Product Line" bodyClassName="p-3">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={policiesByProduct} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="product" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                  <Bar dataKey="policies" name="Policies" fill="#1F3B73" radius={[3, 3, 0, 0]} barSize={28} />
                  <Bar dataKey="pgs" name="PGs" fill="#3B82F6" radius={[3, 3, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title={`Policy Portfolio (${policies.count})`} bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {['Policy #', 'Client', 'Product', 'Broker', 'PGs', 'Non-Std', 'Pending', 'Effective'].map(
                      (col) => (
                        <th
                          key={col}
                          scope="col"
                          className="px-3 py-2 text-[11.5px] font-semibold text-gray-600"
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {policies.items.map((p) => (
                    <tr key={p.policy_id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-[12px] text-gray-800">{p.policy_number}</td>
                      <td className="px-3 py-2 text-[12px] text-gray-700">{p.client_name}</td>
                      <td className="px-3 py-2 text-[12px] text-gray-600">
                        {p.product_line ? (
                          <span className="inline-flex rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-2xs font-medium text-gray-700">
                            {p.product_line}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-gray-600">{p.broker_producer}</td>
                      <td className="px-3 py-2 text-[12px] font-semibold text-navy-800">{p.applicable_pgs}</td>
                      <td className="px-3 py-2 text-[12px] text-amber-700">{p.non_standard_pgs}</td>
                      <td className="px-3 py-2 text-[12px] text-blue-700">{p.pending_pgs}</td>
                      <td className="px-3 py-2 text-[12px] text-gray-500">
                        {p.effective_date ? `${p.effective_date}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'pgs' && pgs && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Panel title="PGs by Category" bodyClassName="p-3">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pgsByCategory} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
                    <CartesianGrid stroke="#F1F5F9" vertical={false} />
                    <XAxis
                      dataKey="category"
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={70}
                      {...axisProps}
                    />
                    <YAxis {...axisProps} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    <Bar dataKey="total" name="Total PGs" fill="#1F3B73" radius={[3, 3, 0, 0]} barSize={22} />
                    <Bar
                      dataKey="non_standard"
                      name="Non-Standard"
                      fill="#F59E0B"
                      radius={[3, 3, 0, 0]}
                      barSize={22}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Category Snapshot" bodyClassName="p-3">
              <div className="grid grid-cols-2 gap-2">
                <MiniStat label="Categories" value={String(pgsByCategory.length)} />
                <MiniStat label="Metrics" value={String(pgs.count)} />
                <MiniStat
                  label="Attention"
                  value={String(pgs.items.reduce((s, p) => s + p.attention_pgs, 0))}
                  tone="text-red-600"
                />
                <MiniStat
                  label="Amended"
                  value={String(pgs.items.reduce((s, p) => s + p.amended_pgs, 0))}
                  tone="text-blue-700"
                />
              </div>
              <div className="mt-3 rounded border border-gray-100 bg-gradient-to-br from-navy-50 to-blue-50 px-3 py-2.5">
                <p className="text-2xs font-medium uppercase tracking-wide text-gray-600">Avg Penalty Allocation</p>
                <p className="mt-0.5 text-[22px] font-bold leading-tight text-navy-800">
                  {(
                    pgs.items.reduce((s, p) => s + parseFloat(p.avg_penalty_allocation_pct), 0) /
                    (pgs.items.length || 1)
                  ).toFixed(1)}
                  %
                </p>
                <p className="text-2xs text-gray-500">Weighted across all PG metrics</p>
              </div>
            </Panel>
          </div>

          <Panel title={`PG Metrics (${pgs.count})`} bodyClassName="p-0">
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-200">
                    {['Metric', 'Category', 'Op Area', 'Total', 'Std', 'Non-Std', 'Attention', 'Avg Penalty'].map(
                      (col) => (
                        <th
                          key={col}
                          scope="col"
                          className="px-3 py-2 text-[11.5px] font-semibold text-gray-600"
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pgs.items.map((p, idx) => (
                    <tr key={idx} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                      <td className="px-3 py-2 text-[12px] font-medium text-gray-800">{p.pg_metric_name}</td>
                      <td className="px-3 py-2 text-[12px] text-gray-600">{p.pg_category}</td>
                      <td className="px-3 py-2 text-[12px] text-gray-500">{p.operational_area}</td>
                      <td className="px-3 py-2 text-[12px] font-semibold text-navy-800">{p.total_pgs}</td>
                      <td className="px-3 py-2 text-[12px] text-emerald-700">{p.standard_pgs}</td>
                      <td className="px-3 py-2 text-[12px] text-amber-700">{p.non_standard_pgs}</td>
                      <td className="px-3 py-2 text-[12px] text-red-600">{p.attention_pgs}</td>
                      <td className="px-3 py-2 text-[12px] font-semibold text-blue-700">
                        {p.avg_penalty_allocation_pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'products' && products && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Panel title="PGs by Product Line" bodyClassName="p-3">
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={products.items} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="product_line" {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    <Bar dataKey="total_pgs" name="Total" fill="#1F3B73" radius={[3, 3, 0, 0]} barSize={26} />
                    <Bar
                      dataKey="non_standard_pgs"
                      name="Non-Standard"
                      fill="#F59E0B"
                      radius={[3, 3, 0, 0]}
                      barSize={26}
                    />
                    <Bar
                      dataKey="attention_pgs"
                      name="Attention"
                      fill="#DC2626"
                      radius={[3, 3, 0, 0]}
                      barSize={26}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Avg Penalty Allocation %" bodyClassName="p-3">
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={products.items.map((p) => ({
                      product_line: p.product_line,
                      pct: parseFloat(p.avg_penalty_allocation_pct),
                    }))}
                    margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="product_line" {...axisProps} />
                    <YAxis unit="%" {...axisProps} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toFixed(2)}%`, 'Avg']} />
                    <Bar dataKey="pct" fill="#3B82F6" radius={[3, 3, 0, 0]} barSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <Panel title={`Product Portfolio (${products.count})`} bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {[
                      'Product Line',
                      'Total PGs',
                      'Non-Standard',
                      'Pending',
                      'Attention',
                      'Avg Penalty',
                      'Contracts',
                    ].map((col) => (
                      <th
                        key={col}
                        scope="col"
                        className="px-3 py-2 text-[11.5px] font-semibold text-gray-600"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.items.map((p, idx) => (
                    <tr key={idx} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                      <td className="px-3 py-2 text-[12px] font-semibold text-navy-800">{p.product_line}</td>
                      <td className="px-3 py-2 text-[12px] text-gray-700">{p.total_pgs}</td>
                      <td className="px-3 py-2 text-[12px] text-amber-700">{p.non_standard_pgs}</td>
                      <td className="px-3 py-2 text-[12px] text-blue-700">{p.pending_pgs}</td>
                      <td className="px-3 py-2 text-[12px] text-red-600">{p.attention_pgs}</td>
                      <td className="px-3 py-2 text-[12px] font-semibold text-blue-700">
                        {p.avg_penalty_allocation_pct}%
                      </td>
                      <td className="px-3 py-2 text-[12px] text-gray-600">{p.contracts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'brokers' && brokers && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Panel title="Broker Contract Volume" bodyClassName="p-3">
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={brokers.items} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="broker_producer" {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    <Bar dataKey="contracts" name="Contracts" fill="#1F3B73" radius={[3, 3, 0, 0]} barSize={30} />
                    <Bar dataKey="clients" name="Clients" fill="#3B82F6" radius={[3, 3, 0, 0]} barSize={30} />
                    <Bar dataKey="total_pgs" name="PGs" fill="#93C5FD" radius={[3, 3, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Dollar Caps by Broker" bodyClassName="p-3">
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={brokers.items.map((b) => ({
                        name: b.broker_producer,
                        value: parseFloat(b.known_dollar_caps),
                      }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {brokers.items.map((_, i) => (
                        <Cell key={i} fill={chartPalette[i % chartPalette.length]} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v), '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <Panel title={`Broker Portfolio (${brokers.count})`} bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {[
                      'Broker',
                      'Clients',
                      'Contracts',
                      'Total PGs',
                      'Non-Standard',
                      'Dollar Caps',
                      'Open Exceptions',
                      'Next End',
                    ].map((col) => (
                      <th
                        key={col}
                        scope="col"
                        className="px-3 py-2 text-[11.5px] font-semibold text-gray-600"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {brokers.items.map((b, idx) => (
                    <tr key={idx} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                      <td className="px-3 py-2 text-[12px] font-semibold text-navy-800">
                        <span className="inline-flex items-center gap-1.5">
                          <BuildingIcon className="h-3.5 w-3.5 text-gray-400" />
                          {b.broker_producer}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[12px] text-gray-700">{b.clients}</td>
                      <td className="px-3 py-2 text-[12px] text-gray-700">{b.contracts}</td>
                      <td className="px-3 py-2 text-[12px] font-semibold text-navy-800">{b.total_pgs}</td>
                      <td className="px-3 py-2 text-[12px] text-amber-700">{b.non_standard_pgs}</td>
                      <td className="px-3 py-2 text-[12px] font-semibold text-emerald-700">
                        {formatCurrency(b.known_dollar_caps)}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-red-600">{b.open_exceptions}</td>
                      <td className="px-3 py-2 text-[12px] text-gray-500">{b.next_contract_end}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'operations' && operations && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Panel title="Review Workload by Status" bodyClassName="p-3">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reviewByStatus}
                      dataKey="items"
                      nameKey="status"
                      innerRadius={48}
                      outerRadius={82}
                      paddingAngle={2}
                    >
                      {reviewByStatus.map((_, i) => (
                        <Cell key={i} fill={chartPalette[i % chartPalette.length]} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Exceptions by Type" bodyClassName="p-3">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={operations.data.exceptions.map((e) => ({
                      type: e.exception_type.replace(/_/g, ' '),
                      items: e.items,
                    }))}
                    layout="vertical"
                    margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" {...axisProps} />
                    <YAxis type="category" dataKey="type" width={130} {...axisProps} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="items" fill="#DC2626" radius={[0, 3, 3, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Operations Snapshot" bodyClassName="p-3">
              <div className="grid grid-cols-2 gap-2">
                <MiniStat
                  label="Total Items"
                  value={String(operations.data.review_workload.reduce((s, w) => s + w.items, 0))}
                />
                <MiniStat
                  label="Overdue"
                  value={String(operations.data.review_workload.reduce((s, w) => s + w.overdue_items, 0))}
                  tone="text-red-600"
                />
                <MiniStat
                  label="Exceptions"
                  value={String(operations.data.exceptions.reduce((s, e) => s + e.items, 0))}
                  tone="text-amber-700"
                />
                <MiniStat
                  label="Types"
                  value={String(operations.data.exceptions.length)}
                  tone="text-blue-700"
                />
              </div>
              <div className="mt-3 rounded border border-gray-100 bg-gradient-to-br from-navy-50 to-blue-50 px-3 py-2.5">
                <p className="text-2xs font-medium uppercase tracking-wide text-gray-600">Avg Review Age</p>
                <p className="mt-0.5 text-[22px] font-bold leading-tight text-navy-800">
                  {(
                    operations.data.review_workload.reduce(
                      (s, w) => s + parseFloat(w.average_age_hours),
                      0
                    ) / (operations.data.review_workload.length || 1)
                  ).toFixed(1)}
                  h
                </p>
                <p className="text-2xs text-gray-500">Weighted across all queues</p>
              </div>
            </Panel>
          </div>

          <Panel title="Contract Intake Timeline" bodyClassName="p-3">
            {operations.data.intake_timeline.length === 1 ? (
              (() => {
                const day = operations.data.intake_timeline[0];
                const cost = parseFloat(day.estimated_ai_cost_usd);
                return (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                    <div className="flex flex-col justify-center gap-2 rounded border border-gray-100 bg-gradient-to-br from-navy-50 to-blue-50 px-4 py-3">
                      <p className="text-2xs font-medium uppercase tracking-wide text-gray-600">Intake Day</p>
                      <p className="text-[20px] font-bold leading-tight text-navy-800">{day.day}</p>
                      <div className="mt-1 grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-2xs uppercase tracking-wide text-gray-500">Contracts</p>
                          <p className="text-[18px] font-semibold text-navy-800">{day.contracts}</p>
                        </div>
                        <div>
                          <p className="text-2xs uppercase tracking-wide text-gray-500">PGs</p>
                          <p className="text-[18px] font-semibold text-blue-700">{day.extracted_pgs}</p>
                        </div>
                        <div>
                          <p className="text-2xs uppercase tracking-wide text-gray-500">AI Cost</p>
                          <p className="text-[18px] font-semibold text-emerald-700">${cost.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { metric: 'Contracts', value: day.contracts, fill: '#1F3B73' },
                            { metric: 'Extracted PGs', value: day.extracted_pgs, fill: '#3B82F6' },
                            { metric: 'PGs / Contract', value: day.contracts ? Math.round(day.extracted_pgs / day.contracts) : 0, fill: '#60A5FA' },
                          ]}
                          layout="vertical"
                          margin={{ top: 8, right: 24, bottom: 4, left: 8 }}
                        >
                          <CartesianGrid stroke="#F1F5F9" horizontal={false} />
                          <XAxis type="number" {...axisProps} />
                          <YAxis type="category" dataKey="metric" width={110} {...axisProps} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={26}>
                            {[0, 1, 2].map((i) => (
                              <Cell key={i} fill={chartPalette[i]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={operations.data.intake_timeline}
                    margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                    <XAxis dataKey="day" {...axisProps} />
                    <YAxis yAxisId="left" {...axisProps} />
                    <YAxis yAxisId="right" orientation="right" unit="$" {...axisProps} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    <Bar
                      yAxisId="left"
                      dataKey="contracts"
                      name="Contracts"
                      fill="#1F3B73"
                      radius={[3, 3, 0, 0]}
                      barSize={22}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="extracted_pgs"
                      name="Extracted PGs"
                      fill="#3B82F6"
                      radius={[3, 3, 0, 0]}
                      barSize={22}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey={(d: { estimated_ai_cost_usd: string }) => parseFloat(d.estimated_ai_cost_usd)}
                      name="AI Cost ($)"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ fill: '#10B981', r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <Panel title="Review Queue Detail" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {['Assignee', 'Status', 'Priority', 'Items', 'Overdue', 'Avg Age (h)'].map((col) => (
                      <th key={col} scope="col" className="px-3 py-2 text-[11.5px] font-semibold text-gray-600">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {operations.data.review_workload.map((w, idx) => (
                    <tr key={idx} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                      <td className="px-3 py-2 text-[12px] text-gray-700">
                        <span className="inline-flex items-center gap-1.5">
                          <UsersIcon className="h-3.5 w-3.5 text-gray-400" />
                          {w.assignee}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill status={w.status} />
                      </td>
                      <td className="px-3 py-2 text-[12px] text-gray-600">P{w.priority}</td>
                      <td className="px-3 py-2 text-[12px] font-semibold text-navy-800">{w.items}</td>
                      <td className="px-3 py-2 text-[12px] text-red-600">{w.overdue_items}</td>
                      <td className="px-3 py-2 text-[12px] text-gray-600">
                        {parseFloat(w.average_age_hours).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
