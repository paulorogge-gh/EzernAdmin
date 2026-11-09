import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '../../components/ui/Page';
import { APP } from '../../lib/httpSurface';

const TABS = [
  { to: APP.settingsCompany, label: 'Empresa' },
  { to: APP.settingsAsaas, label: 'Asaas / NFS-e' },
  { to: APP.settingsAccounts, label: 'Contas' },
  { to: APP.settingsCards, label: 'Cartões' },
  { to: APP.settingsCategories, label: 'Categorias' },
  { to: APP.settingsCostCenters, label: 'Centros de custo' },
];

export function SettingsLayout() {
  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Empresa, fiscal, Asaas e cadastros financeiros."
      />
      <nav className="settings-tabs" aria-label="Configurações">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `settings-tabs__item ${isActive ? 'is-active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
