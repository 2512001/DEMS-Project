import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';
import RoleBadge, { roleLabel } from '../RoleBadge.jsx';
import { initials } from '../../utils/format.js';

export default function UserMenu() {
  const { user, role, walletAddress, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const displayName = user?.profile?.displayName || '';
  const address = walletAddress || user?.walletAddress || '';
  const profilePath = role === 'admin' || role === 'super_admin' ? '/admin/organization' : '/citizen/profile';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-[9px] border border-line bg-card py-1 pl-1 pr-2 transition hover:bg-surface"
        aria-label="Account menu"
        aria-expanded={open}
      >
        <span className="grid h-7 w-7 place-items-center rounded-[7px] bg-brand-soft text-[11.5px] font-semibold text-brand">
          {initials(displayName, address)}
        </span>
        <span className="hidden max-w-[110px] truncate text-[13px] font-medium text-ink md:inline">
          {displayName || 'Account'}
        </span>
        <ChevronDown size={13} className="text-ink-faint" />
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[260px] animate-slide-up overflow-hidden rounded-card border border-line bg-card shadow-pop">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-[13.5px] font-semibold text-ink">
              {displayName || 'Unnamed account'}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-ink-muted">
              {user?.profile?.email || 'Authorized account'}
            </p>
            <div className="mt-2">
              <RoleBadge role={user?.role || role} />
            </div>
          </div>
          <nav className="p-1.5">
            <Link
              to={profilePath}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[13px] text-ink-muted transition hover:bg-surface hover:text-ink"
            >
              <User size={14} />
              Profile
            </Link>
            {role === 'admin' ? (
              <Link
                to="/admin/organization"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[13px] text-ink-muted transition hover:bg-surface hover:text-ink"
              >
                <Settings size={14} />
                Organization settings
              </Link>
            ) : null}
            <div className="my-1 border-t border-line" />
            <div className="px-2.5 py-1.5 text-[11.5px] text-ink-faint">
              Signed in as {roleLabel(user?.role || role)}
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left text-[13px] text-ink-muted transition hover:bg-danger-soft hover:text-danger"
            >
              <LogOut size={14} />
              Disconnect wallet
            </button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
