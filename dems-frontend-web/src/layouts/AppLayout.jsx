import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Archive, BadgeCheck, ClipboardList, FileSearch, LayoutDashboard, LogOut, ShieldCheck, UploadCloud, User, Users } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import RoleBadge from '../components/RoleBadge.jsx';
import { shortAddress } from '../utils/format.js';

const nav = {
  citizen: [
    ['Dashboard', '/citizen/dashboard', LayoutDashboard],
    ['Evidence Vault', '/citizen/evidence-vault', Archive],
    ['Profile', '/citizen/profile', User]
  ],
  officer: [
    ['Dashboard', '/officer/dashboard', LayoutDashboard],
    ['Upload Evidence', '/officer/upload-evidence', UploadCloud],
    ['Chain Of Custody', '/officer/chain-of-custody', ClipboardList],
    ['Evidence Tracking', '/officer/evidence-tracking', FileSearch]
  ],
  admin: [
    ['Dashboard', '/admin/dashboard', ShieldCheck],
    ['Officer Approval', '/admin/officer-approval', BadgeCheck],
    ['User Management', '/admin/users', Users],
    ['Audit Logs', '/admin/audit-logs', ClipboardList]
  ]
};

export default function AppLayout({ section }) {
  const { user, role, walletAddress, logout, isSepolia, forceSepolia } = useAuth();
  const links = [
    ...nav.citizen,
    ...(role === 'officer' || role === 'admin' ? nav.officer : []),
    ...(role === 'admin' ? nav.admin : [])
  ];

  return (
    <div className="vault-shell">
      <div className="vault-bg" />
      <div className="relative z-10 grid min-h-screen grid-cols-[260px_minmax(0,1fr)] max-lg:grid-cols-1">
        <aside className="border-r border-slate-800 bg-black/30 p-4 max-lg:border-b max-lg:border-r-0">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center border border-sky-400/50 bg-sky-400/10 text-sky-200"><ShieldCheck size={24} /></span>
            <div>
              <p className="text-xs uppercase text-sky-300">DEMS Console</p>
              <p className="font-extrabold">Secure Vault</p>
            </div>
          </div>
          <nav className="grid gap-2">
            {links.map(([label, to, Icon]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 p-5">
          <header className="mb-5 flex items-center justify-between gap-4 border-b border-slate-800 pb-4 max-md:flex-col max-md:items-start">
            <div>
              <p className="text-xs uppercase text-sky-300">{section} command area</p>
              <h1 className="text-2xl font-extrabold">Decentralized Evidence Management System</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isSepolia ? <button className="btn-secondary" onClick={forceSepolia}>Switch Sepolia</button> : null}
              <RoleBadge role={user?.role || role} />
              <code className="text-sky-200">{shortAddress(walletAddress || user?.walletAddress)}</code>
              <button className="icon-btn" onClick={logout} title="Disconnect"><LogOut size={18} /></button>
            </div>
          </header>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
