import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import BrandMark from '../components/ui/BrandMark.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

const LINKS = [
  { to: '/public/features', label: 'Capabilities' },
  { to: '/public/about', label: 'About' }
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5">
          <Link to="/" aria-label="DEMS home">
            <BrandMark />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Public navigation">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-[7px] px-3 py-2 text-[13px] font-medium transition ${
                    isActive ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:bg-surface hover:text-ink'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <Link to="/auth/wallet-login" className="btn-primary ml-2">
              Sign in
            </Link>
          </nav>

          <button
            type="button"
            className="icon-btn md:hidden"
            onClick={() => setOpen((current) => !current)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {open ? (
          <div className="border-t border-line bg-card px-5 py-3 md:hidden">
            <nav className="grid gap-1" aria-label="Public navigation">
              {LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `rounded-[7px] px-3 py-2 text-[13.5px] font-medium ${
                      isActive ? 'bg-brand-soft text-brand' : 'text-ink-muted'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <Link to="/auth/wallet-login" className="btn-primary mt-2" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      <footer className="border-t border-line bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
          <BrandMark size="sm" />
          <p className="text-[12px] text-ink-faint">
            Encrypted storage · Decentralized · Independently verifiable
          </p>
        </div>
      </footer>
    </div>
  );
}
