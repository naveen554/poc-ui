import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'neutral';
}

export function KpiCard({ label, value, delta, trend }: KpiCardProps) {
  const Icon = trend === 'up' ? TrendingUpIcon : trend === 'down' ? TrendingDownIcon : MinusIcon;
  const trendColor =
    trend === 'up'
      ? 'text-emerald-600'
      : trend === 'down'
      ? 'text-red-500'
      : 'text-gray-500';
  
  return (
    <div className="rounded-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[12px] font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-[26px] font-bold leading-8 text-navy-800">{value}</p>
      <p className={`mt-1 inline-flex items-center gap-1 text-[11.5px] ${trendColor}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {delta}
      </p>
    </div>
  );
}