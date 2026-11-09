import { useEffect, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import { PageSection } from '../../components/ui/Page';
import { useNotify } from '../../contexts/NotifyContext';
import { api } from '../../lib/api';
import { dateBr, moneyBr } from '../../lib/financeLabels';
import { API } from '../../lib/httpSurface';
import { displayPartyName } from '../../lib/partyForm';

const STATUS_TONE = {
  pending: 'warn',
  confirmed: 'info',
  received: 'ok',
  overdue: 'danger',
  refunded: 'neutral',
  cancelled: 'neutral',
  deleted: 'neutral',
};

export function BillingChargesPage() {
  const { notify } = useNotify();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setRows(await api(API.billingCharges));
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <PageSection title="Cobranças" flush>
      <DataTable
        flush
        loading={loading}
        rows={rows}
        emptyMessage="Nenhuma cobrança gerada ainda."
        columns={[
          {
            key: 'description',
            label: 'Descrição',
            primary: true,
            secondary: (row) => displayPartyName(row.party) || '',
          },
          {
            key: 'dueDate',
            label: 'Vencimento',
            narrow: true,
            render: (row) => dateBr(row.dueDate),
          },
          {
            key: 'amount',
            label: 'Valor',
            narrow: true,
            render: (row) => <span className="text-success">{moneyBr(row.amount)}</span>,
          },
          {
            key: 'status',
            label: 'Status',
            narrow: true,
            render: (row) => (
              <Badge tone={STATUS_TONE[row.status] || 'neutral'}>{row.status}</Badge>
            ),
          },
          {
            key: 'nfStatus',
            label: 'NFS-e',
            narrow: true,
            render: (row) => row.nfStatus || 'none',
          },
          {
            key: 'bankSlipUrl',
            label: 'Boleto',
            narrow: true,
            render: (row) =>
              row.bankSlipUrl ? (
                <a href={row.bankSlipUrl} target="_blank" rel="noreferrer">
                  Abrir
                </a>
              ) : (
                '-'
              ),
          },
        ]}
      />
    </PageSection>
  );
}
