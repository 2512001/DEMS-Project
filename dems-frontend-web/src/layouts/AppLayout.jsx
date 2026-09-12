import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Archive, BadgeCheck, ClipboardList, FileSearch, LayoutDashboard, LogOut, ShieldAlert, ShieldCheck, UploadCloud, User, Users, Wallet, ChevronRight, Settings } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import RoleBadge from '../components/RoleBadge.jsx';
import { shortAddress } from '../utils/format.js';

const nav = {
  citizen: [
    ['Dashboard', '/citizen/dashboard', LayoutDashboard],
    ['Upload', '/citizen/upload-evidence', UploadCloud],
    ['My Evidence', '/citizen/evidence-vault', Archive],
    ['Profile', '/citizen/profile', User]
  ],
  officer: [
    ['Dashboard', '/officer/dashboard', LayoutDashboard],
    ['Upload Evidence', '/officer/upload-evidence', UploadCloud],
    ['My Evidence', '/citizen/evidence-vault', Archive],
    ['Pending Reviews', '/officer/pending-reviews', ShieldAlert],
    ['Modification Requests', '/officer/modifications', ClipboardList],
    ['Profile', '/citizen/profile', User]
  ],
  admin: [
    ['Dashboard', '/admin/dashboard', ShieldCheck],
    ['Employees', '/admin/users', Users],
    ['Evidence', '/admin/evidence', Archive],
    ['Quarantine', '/admin/quarantine', ShieldAlert],
    ['Modification Requests', '/admin/modifications', FileSearch],
    ['Employee Approval', '/admin/officer-approval', BadgeCheck],
    ['Audit Logs', '/admin/audit-logs', ClipboardList],
    ['Organization Settings', '/admin/organization', Settings]
  ]
};

function NavItem({ label, to, Icon }) {
  return (
    <NavLink to={to}>
      {({ isActive }) => (
        <div
          className={`
            group relative flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-300
            ${
              isActive
                ? 'border-sky-500/50 bg-gradient-to-r from-sky-500/20 to-sky-600/10 shadow-lg shadow-sky-500/20'
                : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50 hover:bg-slate-700/30'
            }
          `}
        >
          <div
            className={`
              flex items-center justify-center rounded-lg p-2 transition-all duration-300
              ${
                isActive
                  ? 'bg-sky-500/30'
                  : 'bg-slate-700/50 group-hover:bg-slate-600/50'
              }
            `}
          >
            <Icon
              size={18}
              className={
                isActive
                  ? 'text-sky-400'
                  : 'text-slate-400 group-hover:text-slate-300'
              }
            />
          </div>

          <span
            className={`font-medium transition-colors ${
              isActive
                ? 'text-sky-200'
                : 'text-slate-300 group-hover:text-white'
            }`}
          >
            {label}
          </span>

          {isActive && (
            <ChevronRight
              size={16}
              className="ml-auto text-sky-400"
            />
          )}

          <div
            className={`absolute inset-0 rounded-xl bg-gradient-to-r from-sky-500/0 via-sky-500/5 to-sky-500/0 opacity-0 transition-opacity duration-300 ${
              isActive ? 'opacity-100' : 'group-hover:opacity-50'
            }`}
          />
        </div>
      )}
    </NavLink>
  );
}

export default function AppLayout({ section }) {
  const { user, role, walletAddress, logout, isSepolia, forceSepolia } = useAuth();
  const links = nav[role] || nav.citizen;

  return (
    <div className="vault-shell">
      <div className="vault-bg" />
      <div className="relative z-10 grid min-h-screen grid-cols-[280px_minmax(0,1fr)] max-lg:grid-cols-1">
        {/* Sidebar */}
        <aside className="border-r border-slate-800/50 bg-gradient-to-b from-slate-900/80 to-slate-950/80 backdrop-blur-xl p-6 max-lg:border-b max-lg:border-r-0">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-4">
            <div className="relative flex items-center justify-center rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/20 to-sky-600/10 p-3 shadow-lg shadow-sky-500/20">
              <ShieldCheck size={28} className="text-sky-400" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-sky-500/0 via-sky-500/10 to-sky-500/0" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">DEMS Console</p>
              <p className="text-lg font-bold text-white">Secure Vault</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="grid gap-2">
            {links.map(([label, to, Icon]) => (
              <NavItem key={to} label={label} to={to} Icon={Icon} />
            ))}
          </nav>

          {/* User Info Card */}
          <div className="mt-8 rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/30 to-slate-900/30 p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center rounded-lg bg-slate-700/50 p-2">
                <Wallet size={18} className="text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Connected Wallet</p>
                <p className="mt-1 text-sm font-mono text-slate-300 truncate">
                  {shortAddress(walletAddress || user?.walletAddress)}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 p-6 lg:p-8">
          {/* Header */}
          <header className="mb-8 flex flex-col gap-4 border-b border-slate-800/50 pb-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-400 mb-1">{section} command area</p>
              <h1 className="text-3xl font-bold text-white">Decentralized Evidence Management System</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {!isSepolia ? (
                <button
                  onClick={forceSepolia}
                  className="group flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 transition-all hover:border-amber-500/50 hover:bg-amber-500/20 hover:shadow-lg hover:shadow-amber-500/20"
                >
                  <span className="animate-pulse">●</span>
                  Switch to Sepolia
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/50" />
                  <span className="text-sm font-medium text-emerald-300">Sepolia Network</span>
                </div>
              )}
              <RoleBadge role={user?.role || role} />
              <button
                onClick={logout}
                className="group flex items-center gap-2 rounded-xl border border-slate-600/50 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
                title="Disconnect"
              >
                <LogOut size={18} className="transition-transform group-hover:rotate-180" />
                <span className="max-sm:hidden">Disconnect</span>
              </button>
            </div>
          </header>

          {/* Page Content */}
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
