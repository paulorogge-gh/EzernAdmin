import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  IconBell,
  IconBuildingStore,
  IconChartBar,
  IconChevronLeft,
  IconChevronRight,
  IconCreditCard,
  IconFileInvoice,
  IconLogout,
  IconMoon,
  IconReceipt,
  IconSettings,
  IconSun,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import { IconButton } from './ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { applyTheme, getStoredTheme } from '../lib/theme';
import { APP } from '../lib/httpSurface';
import { roleLabel } from '../lib/userForm';

const SIDEBAR_KEY = 'ezern_admin_sidebar_collapsed';

const links = [
  { to: APP.home, label: 'Painel', icon: IconChartBar, end: true },
  { to: APP.transactions, label: 'Lançamentos', icon: IconReceipt, roles: ['OWNER', 'ADMIN'], end: true },
  { to: APP.invoices, label: 'Faturas de cartão', icon: IconCreditCard, roles: ['OWNER', 'ADMIN'] },
  {
    to: APP.billingContracts,
    label: 'Faturamento',
    icon: IconFileInvoice,
    roles: ['OWNER', 'ADMIN'],
    matchPrefix: APP.billing,
  },
  { to: APP.parties, label: 'Clientes e fornecedores', icon: IconBuildingStore, roles: ['OWNER', 'ADMIN'] },
  { to: APP.settingsAccounts, label: 'Configurações', icon: IconSettings, roles: ['OWNER', 'ADMIN'], matchPrefix: APP.settings },
  { to: APP.members, label: 'Usuários', icon: IconUsers, roles: ['OWNER', 'ADMIN'] },
];

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function useTheme() {
  const [theme, setTheme] = useState(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return {
    theme,
    toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
  };
}

function useClickOutside(refs, open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    function onDoc(event) {
      const target = event.target;
      if (refs.some((ref) => ref.current?.contains(target))) return;
      onClose();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose, refs]);
}

const SETTINGS_CRUMBS = {
  [APP.settingsAccounts]: 'Contas',
  [APP.settingsCards]: 'Cartões',
  [APP.settingsCategories]: 'Categorias',
  [APP.settingsCostCenters]: 'Centros de custo',
  [APP.settingsCompany]: 'Empresa',
  [APP.settingsAsaas]: 'Asaas / NFS-e',
};

function buildBreadcrumbs(pathname, navItems) {
  const crumbs = [{ to: '/', label: 'Painel' }];
  if (pathname === '/' || pathname === '') return crumbs;

  if (pathname.startsWith(APP.settings)) {
    crumbs.push({ to: APP.settingsAccounts, label: 'Configurações' });
    const tab = SETTINGS_CRUMBS[pathname];
    if (tab) crumbs.push({ to: pathname, label: tab });
    return crumbs;
  }

  if (pathname === APP.invoices) {
    crumbs.push({ to: APP.transactions, label: 'Financeiro' });
    crumbs.push({ to: APP.invoices, label: 'Faturas de cartão' });
    return crumbs;
  }

  if (pathname === APP.transactions) {
    crumbs.push({ to: APP.transactions, label: 'Lançamentos' });
    return crumbs;
  }

  if (pathname.startsWith(APP.billing)) {
    crumbs.push({ to: APP.billingContracts, label: 'Faturamento' });
    if (pathname === APP.billingCharges) crumbs.push({ to: pathname, label: 'Cobranças' });
    if (pathname === APP.billingServices) crumbs.push({ to: pathname, label: 'Serviços' });
    if (pathname === APP.billingTaxes) crumbs.push({ to: pathname, label: 'Impostos Simples' });
    if (pathname === APP.billingContracts) crumbs.push({ to: pathname, label: 'Contratos' });
    return crumbs;
  }

  const match = navItems.find((item) => {
    const prefix = item.matchPrefix || item.to;
    return item.end
      ? pathname === item.to
      : pathname === item.to || pathname.startsWith(`${prefix}/`) || pathname === prefix;
  });

  if (match && match.to !== '/') {
    crumbs.push({ to: match.to, label: match.label });
  }

  return crumbs;
}

export function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle: toggleTheme } = useTheme();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  useClickOutside([notifRef], notifOpen, () => setNotifOpen(false));
  useClickOutside([userRef], userOpen, () => setUserOpen(false));

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') {
        setNotifOpen(false);
        setUserOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setNotifOpen(false);
    setUserOpen(false);
  }, [location.pathname]);

  const navItems = useMemo(
    () => links.filter((item) => !item.roles || item.roles.includes(user?.role)),
    [user?.role],
  );

  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(location.pathname, navItems),
    [location.pathname, navItems],
  );

  async function onLogout() {
    await logout();
    navigate(APP.login);
  }

  return (
    <div className={`app-shell ${collapsed ? 'is-collapsed' : ''}`.trim()}>
      <aside className="app-sidebar anim-fade-in">
        <div className="app-sidebar__header">
          <div className="app-brand" aria-label="Ezern Administrator">
            <p className="app-brand__name">Ezern</p>
            <p className="app-brand__tag">Administrator</p>
          </div>
        </div>

        <button
          type="button"
          className="app-sidebar__collapse"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? (
            <IconChevronRight size={18} stroke={2} />
          ) : (
            <IconChevronLeft size={18} stroke={2} />
          )}
        </button>

        <nav className="app-nav" aria-label="Principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.label}
                className={({ isActive }) => {
                  const prefix = item.matchPrefix;
                  const byPrefix =
                    prefix &&
                    (location.pathname === prefix ||
                      location.pathname.startsWith(`${prefix}/`));
                  return `app-nav__link ${isActive || byPrefix ? 'is-active' : ''}`;
                }}
              >
                <Icon size={18} stroke={1.75} />
                <span className="app-nav__label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-topbar anim-fade-in">
          <div className="app-topbar__inner">
            <nav className="app-breadcrumb" aria-label="Caminho">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <span key={`${crumb.to}-${crumb.label}`} className="app-breadcrumb__item">
                    {index > 0 ? <span className="app-breadcrumb__sep">/</span> : null}
                    {isLast ? (
                      <span className="app-breadcrumb__current" aria-current="page">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link to={crumb.to} className="app-breadcrumb__link">
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                );
              })}
            </nav>

            <div className="app-topbar__actions">
              <div className="app-menu" ref={notifRef}>
                <IconButton
                  title="Notificações"
                  aria-label="Notificações"
                  aria-expanded={notifOpen}
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    setUserOpen(false);
                  }}
                >
                  <IconBell size={18} stroke={1.75} />
                </IconButton>
                {notifOpen ? (
                  <div className="app-menu__panel app-menu__panel--notif" role="menu">
                    <div className="app-menu__head">Notificações</div>
                    <p className="app-menu__empty">Nenhuma notificação no momento.</p>
                  </div>
                ) : null}
              </div>

              <IconButton
                title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
                aria-label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? (
                  <IconSun size={18} stroke={1.75} />
                ) : (
                  <IconMoon size={18} stroke={1.75} />
                )}
              </IconButton>

              <div className="app-menu" ref={userRef}>
                <button
                  type="button"
                  className="user-chip user-chip--button"
                  aria-expanded={userOpen}
                  onClick={() => {
                    setUserOpen((v) => !v);
                    setNotifOpen(false);
                  }}
                >
                  <span className="user-chip__avatar" aria-hidden>
                    {initials(user?.name)}
                  </span>
                  <div className="user-chip__text">
                    <p className="user-chip__name">{user?.name}</p>
                    <p className="user-chip__meta">{roleLabel(user?.role)}</p>
                  </div>
                </button>
                {userOpen ? (
                  <div className="app-menu__panel app-menu__panel--user" role="menu">
                    <div className="app-menu__user">
                      <p className="app-menu__user-name">{user?.name}</p>
                      <p className="app-menu__user-email">{user?.email}</p>
                    </div>
                    <button
                      type="button"
                      className="app-menu__item"
                      role="menuitem"
                      onClick={() => {
                        setUserOpen(false);
                        navigate(APP.profile);
                      }}
                    >
                      <IconUser size={16} stroke={1.75} />
                      Meu perfil
                    </button>
                    <button
                      type="button"
                      className="app-menu__item app-menu__item--danger"
                      role="menuitem"
                      onClick={() => void onLogout()}
                    >
                      <IconLogout size={16} stroke={1.75} />
                      Sair
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="app-content">
          <div className="app-content__inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
