import React from 'react';
import { NavLink } from 'react-router-dom';

const links = [
{ to: '/files', label: 'Files' },
{ to: '/reports', label: 'Reports' }];


export function TopNav() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-12 w-full max-w-[1400px] items-center px-4">
        <div className="flex items-center gap-2">
          <img
            src="/nyl-logo-rebrand.svg"
            alt="New York Life"
            className="h-7 w-7" />

          <span className="text-sm font-semibold text-navy-800">
            NYL <span className="font-normal text-gray-400">-</span> QCoE PG
          </span>
        </div>

        <nav className="ml-8 flex items-center gap-6 pr-4" aria-label="Main">
          {links.map((link) =>
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
            [
            'border-b-2 pb-0.5 text-[13px] transition-colors duration-150 ease-out',
            isActive ?
            'border-navy-700 font-semibold text-navy-700' :
            'border-transparent text-gray-500 hover:text-navy-700'].
            join(' ')
            }>
            
              {link.label}
            </NavLink>
          )}
        </nav>
        <div className="ml-auto" />
      </div>
    </header>);

}