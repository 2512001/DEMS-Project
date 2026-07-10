import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

export default function PublicLayout() {
  return (
    <div className="vault-shell">
      <div className="vault-bg" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-5">
        <header className="flex items-center justify-between border-b border-slate-800 pb-4">
          <Link to="/" className="flex items-center gap-3 text-slate-100">
            <span className="grid h-10 w-10 place-items-center border border-sky-400/50 bg-sky-400/10 text-sky-200"><ShieldCheck size={22} /></span>
            <span className="font-extrabold tracking-wide">DEMS</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <NavLink className="nav-link" to="/public/about">About</NavLink>
            <NavLink className="nav-link" to="/public/features">Features</NavLink>
            <Link className="btn-primary" to="/auth/wallet-login">Connect Wallet</Link>
          </nav>
        </header>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
    </div>
  );
}
