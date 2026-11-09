import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '../../components/ui/Page';
import { APP } from '../../lib/httpSurface';

const TABS = [
  { to: APP.billingContracts, label: 'Contratos' },
  { to: APP.billingCharges, label: 'Cobranças' },
  { to: APP.billingServices, label: 'Serviços' },
  { to: APP.billingTaxes, label: 'Impostos Simples' },
];

export function BillingLayout() {
  return (
    <div>
      <PageHeader
        title="Faturamento"
        description="Contratos, boletos Asaas, NFS-e e provisão do Simples Nacional."
      />
      <nav className="settings-tabs" aria-label="Faturamento">
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
