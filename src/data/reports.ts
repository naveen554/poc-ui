export const exposureByClient = [
{ client: 'Meridian Holdings', exposure: 42.8 },
{ client: 'Harbor Point LLC', exposure: 36.1 },
{ client: 'Kestrel Capital', exposure: 28.4 },
{ client: 'Ardent Group', exposure: 22.7 },
{ client: 'Northwind Trust', exposure: 18.3 },
{ client: 'Calder & Sons', exposure: 11.9 }];


export const pgBreakdown = [
{ name: 'Standard PG', value: 268 },
{ name: 'Custom PG', value: 94 },
{ name: 'Hybrid PG', value: 41 }];


export const riskIndicators = [
{ month: 'Mar', high: 8, medium: 21, low: 46 },
{ month: 'Apr', high: 11, medium: 19, low: 51 },
{ month: 'May', high: 7, medium: 24, low: 58 },
{ month: 'Jun', high: 14, medium: 27, low: 49 },
{ month: 'Jul', high: 9, medium: 22, low: 62 },
{ month: 'Aug', high: 6, medium: 18, low: 71 }];


export const kpis = [
{ label: 'Total Exposure', value: '$160.2M', delta: '+4.6% vs last month', trend: 'up' as const },
{ label: 'Active Guarantees', value: '403', delta: '+18 this month', trend: 'up' as const },
{ label: 'Custom PG Share', value: '23.3%', delta: '-1.2% vs last month', trend: 'down' as const },
{ label: 'High Risk Accounts', value: '6', delta: '-3 vs last month', trend: 'down' as const }];


export const topRiskAccounts = [
{ client: 'Meridian Holdings', policy: '59104133', exposure: '$42.8M', risk: 'High', pg: 'Custom' },
{ client: 'Kestrel Capital', policy: '59114336', exposure: '$28.4M', risk: 'High', pg: 'Custom' },
{ client: 'Harbor Point LLC', policy: '59107318', exposure: '$36.1M', risk: 'Medium', pg: 'Standard' },
{ client: 'Ardent Group', policy: '59121907', exposure: '$22.7M', risk: 'Medium', pg: 'Hybrid' },
{ client: 'Northwind Trust', policy: '59127740', exposure: '$18.3M', risk: 'Low', pg: 'Standard' }];