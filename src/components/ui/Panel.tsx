import React from 'react';

interface PanelProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
  className?: string;
}

export function Panel({ title, icon, action, children, bodyClassName = '', className = '' }: PanelProps) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm ${className}`}>
      
      <header className="flex h-9 shrink-0 items-center gap-2 bg-navy-700 px-3 text-white">
        {icon}
        <h2 className="text-[13px] font-semibold">{title}</h2>
        <div className="ml-auto flex items-center gap-2">{action}</div>
      </header>
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>);

}