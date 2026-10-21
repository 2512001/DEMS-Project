import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Archive,
  BadgeCheck,
  ChevronRight,
  ClipboardList,
  Command,
  FileSearch,
  FolderLock,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldAlert,
  UploadCloud,
  User,
  Users
} from 'lucide-react';

import { useAuth } from '../auth/AuthContext.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import BrandMark from '../components/ui/BrandMark.jsx';
import GlobalSearch from '../components/layout/GlobalSearch.jsx';
import NetworkStatus from '../components/layout/NetworkStatus.jsx';
import NotificationsMenu from '../components/layout/NotificationsMenu.jsx';
import UserMenu from '../components/layout/UserMenu.jsx';
import { shortAddress } from '../utils/format.js';

/**
 * Navigation is derived strictly from routes that exist in App.jsx.
 * Every item below resolves to a real page guarded by RequireAuth.
 */
const NAVIGATION = {
  citizen: [
    {
      group: 'Workspace',
      items: [
        { label: 'Secure vault', to: '/citizen/dashboard', icon: LayoutDashboard },
        { label: 'My files', to: '/citizen/evidence-vault', icon: FolderLock },
        { label: 'Upload file', to: '/citizen/upload-evidence', icon: UploadCloud }
      ]
    },
    {
      group: 'Account',
      items: [{ label: 'Profile & access', to: '/citizen/profile', icon: User }]
    }
  ],
  officer: [
    {
      group: 'Workspace',
      items: [
        { label: 'Dashboard', to: '/officer/dashboard', icon: LayoutDashboard },
        { label: 'My files', to: '/citizen/evidence-vault', icon: FolderLock },
        { label: 'Upload file', to: '/officer/upload-evidence', icon: UploadCloud },
        { label: 'Pending reviews', to: '/officer/pending-reviews', icon: ShieldAlert }
      ]
    },
    {
      group: 'Governance',
      items: [
        { label: 'Chain of custody', to: '/officer/chain-of-custody', icon: Archive },
        { label: 'Evidence tracking', to: '/officer/evidence-tracking', icon: FileSearch },
        { label: 'Modification requests', to: '/officer/modifications', icon: ClipboardList }
      ]
    },
    {
      group: 'Account',
      items: [{ label: 'Profile & access', to: '/citizen/profile', icon: User }]
    }
  ],
  admin: [
    {
      group: 'Organization',
      items: [
        { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Files', to: '/admin/evidence', icon: FolderLock },
        { label: 'Employees', to: '/admin/users', icon: Users },
        { label: 'Employee approval', to: '/admin/officer-approval', icon: BadgeCheck }
      ]
    },
    {
      group: 'Security',
      items: [
        { label: 'Quarantine', to: '/admin/quarantine', icon: ShieldAlert },
        { label: 'Modification requests', to: '/admin/modifications', icon: FileSearch },
        { label: 'Audit log', to: '/admin/audit-logs', icon: ClipboardList }
      ]
    },
    {
      group: 'Settings',
      items: [{ label: 'Organization settings', to: '/admin/organization', icon: Settings }]
    }
  ],
  super_admin: [
    {
      group: 'Platform',
      items: [
        { label: 'Platform overview', to: '/superadmin/dashboard', icon: LayoutDashboard }
      ]
    }
  ]
};

const SECTION_LABELS = {
  citizen: 'Workspace',
  officer: 'Workspace',
  admin: 'Organization',
  superadmin: 'Platform'
};

const PAGE_NAMES = {
  '/citizen/dashboard': 'Secure vault',
  '/citizen/upload-evidence': 'Upload file',
  '/citizen/evidence-vault': 'My files',
  '/citizen/profile': 'Profile & access',
  '/officer/dashboard': 'Dashboard',
  '/officer/upload-evidence': 'Upload file',
  '/officer/pending-reviews': 'Pending reviews',
  '/officer/chain-of-custody': 'Chain of custody',
  '/officer/evidence-tracking': 'Evidence tracking',
  '/officer/modifications': 'Modification requests',
  '/admin/dashboard': 'Dashboard',
  '/admin/officer-approval': 'Employee approval',
  '/admin/users': 'Employees',
  '/admin/evidence': 'Files',
  '/admin/quarantine': 'Quarantine',
  '/admin/modifications': 'Modification requests',
  '/admin/organization': 'Organization settings',
  '/admin/audit-logs': 'Audit log',
  '/superadmin/dashboard': 'Platform overview'
};

const DETAILS_BASE = {
  citizen: '/citizen/evidence',
  officer: '/citizen/evidence',
  admin: '/citizen/evidence',
  super_admin: '/citizen/evidence'
};

const STORAGE_KEY = 'dems.sidebar.collapsed';

function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile, role }) {
  const groups = NAVIGATION[role] || NAVIGATION.citizen;

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 animate-fade-in bg-[#172033]/35 backdrop-blur-[1px] lg:hidden"
          onClick={onCloseMobile}
        />
      ) : null}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-line bg-card transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:transition-[width]',
          collapsed ? 'lg:w-[72px]' : 'lg:w-[248px]',
          mobileOpen ? 'translate-x-0 shadow-pop lg:shadow-none' : '-translate-x-full'
        ].join(' ')}
      >
        <div className={`flex h-16 shrink-0 items-center border-b border-line ${collapsed ? 'lg:justify-center lg:px-0' : ''} px-4`}>
          <BrandMark size="sm" withText={!collapsed} />
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4" aria-label="Main navigation">
          {groups.map((group) => (
            <div key={group.group}>
              {collapsed ? (
                <div className="my-3 border-t border-line first:hidden lg:block" />
              ) : (
                <p className="nav-group-label">{group.group}</p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={`${item.to}-${item.label}`}>
                      <NavLink
                        to={item.to}
                        end
                        onClick={onCloseMobile}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          `nav-link ${isActive ? 'nav-link-active' : ''} ${collapsed ? 'lg:justify-center lg:px-0' : ''}`
                        }
                      >
                        <Icon size={16} strokeWidth={1.9} className="shrink-0" aria-hidden="true" />
                        <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-line p-2.5">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`nav-link hidden w-full lg:flex ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            {collapsed ? null : <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

function Topbar({ section, onChangeMobileOpen }) {
  const location = useLocation();
  const { role, walletAddress, user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  const sectionKey = section === 'superadmin' ? 'super_admin' : section;
  const pageName =
    PAGE_NAMES[location.pathname] ||
    (location.pathname.startsWith('/citizen/evidence/') ? 'File details' : 'Workspace');

  const canSearch = sectionKey !== 'super_admin';

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && canSearch) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [canSearch]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-card/95 px-4 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={onChangeMobileOpen}
          className="icon-btn -ml-1 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>

        <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
          <ol className="flex items-center gap-1.5 text-[12.5px]">
            <li className="hidden text-ink-faint sm:block">{SECTION_LABELS[section] || 'Workspace'}</li>
            <li className="hidden text-ink-faint sm:block" aria-hidden="true">
              <ChevronRight size={12} />
            </li>
            <li className="truncate font-medium text-ink" aria-current="page">
              {pageName}
            </li>
          </ol>
        </nav>

        {canSearch ? (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden h-8 items-center gap-2 rounded-[8px] border border-line bg-[#FAFBFC] px-2.5 text-[12.5px] text-ink-faint transition hover:border-[#d3d8e0] hover:text-ink-muted md:flex"
            aria-label="Search files"
          >
            <Search size={13} />
            <span>Search files</span>
            <span className="ml-2 flex items-center gap-0.5 rounded border border-line bg-card px-1 py-0.5 text-[10px]">
              <Command size={9} /> K
            </span>
          </button>
        ) : null}

        {canSearch ? (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="icon-btn md:hidden"
            aria-label="Search files"
          >
            <Search size={16} />
          </button>
        ) : null}

        <div className="flex items-center gap-2">
          <NetworkStatus />
          <NotificationsMenu />
          <div className="hidden h-6 w-px bg-line sm:block" />
          <span className="hidden font-mono text-[12px] text-ink-faint xl:inline">
            {shortAddress(walletAddress || user?.walletAddress)}
          </span>
          <UserMenu />
        </div>
      </header>

      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        detailsBase={DETAILS_BASE[role] || '/citizen/evidence'}
      />
    </>
  );
}

export default function AppLayout({ section }) {
  const { role } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* storage may be unavailable */
    }
  }, [collapsed]);

  const sectionKey = section === 'superadmin' ? 'super_admin' : section;
  const gridClass = useMemo(
    () => (collapsed ? 'lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid-cols-[248px_minmax(0,1fr)]'),
    [collapsed]
  );

  return (
    <div className="app-shell">
      <div className={`lg:grid ${gridClass}`}>
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((current) => !current)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          role={sectionKey}
        />

        <div className="app-main flex min-h-screen min-w-0 flex-col">
          <Topbar section={section} onChangeMobileOpen={() => setMobileOpen(true)} />
          <main className="app-content flex-1">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
          <footer className="border-t border-line px-5 py-4 text-[11.5px] text-ink-faint sm:px-8">
            DEMS · Encrypted storage, decentralized and verifiable
          </footer>
        </div>
      </div>
    </div>
  );
}
