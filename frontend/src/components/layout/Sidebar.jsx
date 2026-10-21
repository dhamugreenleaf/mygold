import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiGrid, FiBriefcase, FiPlusCircle, FiTrendingUp } from 'react-icons/fi';
import { GiGoldBar } from 'react-icons/gi';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: FiGrid },
    { name: 'Portfolio', path: '/portfolio', icon: FiBriefcase },
    { name: 'Add Gold', path: '/add-gold', icon: FiPlusCircle },
    { name: 'Gold Rates', path: '/gold-rates', icon: FiTrendingUp },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 border-r border-amber-500/20 text-slate-100 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 h-20 border-b border-slate-800 bg-slate-950/40">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20">
            <GiGoldBar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wider bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              GOLD<span className="font-light text-slate-200">TRACK</span>
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-amber-500/80 font-medium">Live Investment MVP</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-400 border border-amber-500/30 shadow-md shadow-amber-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Badge */}
        <div className="p-4 border-t border-slate-800/80 m-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
          <p className="text-xs text-slate-400">Current Market Purity</p>
          <div className="mt-1 flex items-center justify-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              24K Hallmark
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              22K Standard
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
