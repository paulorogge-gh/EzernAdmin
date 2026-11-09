import { useEffect, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { PageSection } from '../../components/ui/Page';
import { BusyLabel } from '../../components/ui/Processing';
import { useNotify } from '../../contexts/NotifyContext';
import { api } from '../../lib/api';
import { dateBr, moneyBr } from '../../lib/financeLabels';
import { API } from '../../lib/httpSurface';

export function BillingTaxesPage() {
  const { notify } = useNotify();
  const [periods, setPeriods] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [rows, prev] = await Promise.all([
        api(API.billingTaxPeriods),
        api(API.billingTaxPreview),
      ]);
      setPeriods(Array.isArray(rows) ? rows : []);
      setPreview(prev || null);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function closePeriod(competence) {
    setClosing(competence);
    try {
      await api(API.billingTaxClose(competence), { method: 'POST', body: '{}' });
      notify(`Competência ${competence} fechada. DAS gerado no contas a pagar.`, 'success');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setClosing(null);
    }
  }

  return (
    <>
      <PageSection title="Visão atual">
        {preview ? (
          <div className="form-grid-3">
            <div>
              <p className="field__label">Competência</p>
              <p>{preview.competence}</p>
            </div>
            <div>
              <p className="field__label">RBT12</p>
              <p>{moneyBr(preview.rbt12)}</p>
            </div>
            <div>
              <p className="field__label">Fator R</p>
              <p>{(Number(preview.fatorR || 0) * 100).toFixed(2)}%</p>
            </div>
          </div>
        ) : (
          <p className="text-muted text-sm">Sem dados de preview.</p>
        )}
      </PageSection>

      <PageSection title="Competências" flush>
        <DataTable
          flush
          loading={loading}
          rows={periods}
          emptyMessage="Nenhuma competência registrada. As NFS-e autorizadas alimentam o ledger."
          columns={[
            { key: 'competence', label: 'Competência', primary: true },
            {
              key: 'totalBase',
              label: 'Base',
              narrow: true,
              render: (row) => moneyBr(row.totalBase),
            },
            {
              key: 'totalTax',
              label: 'Tributo',
              narrow: true,
              render: (row) => moneyBr(row.totalTax),
            },
            {
              key: 'dueDate',
              label: 'Venc. DAS',
              narrow: true,
              render: (row) => dateBr(row.dueDate),
            },
            {
              key: 'status',
              label: 'Status',
              narrow: true,
              render: (row) => (
                <Badge tone={row.status === 'closed' ? 'ok' : 'warn'}>{row.status}</Badge>
              ),
            },
            {
              key: 'actions',
              label: 'Ações',
              actions: true,
              render: (row) =>
                row.status === 'open' ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={closing === row.competence}
                    onClick={() => void closePeriod(row.competence)}
                  >
                    <BusyLabel active={closing === row.competence} idle="Fechar" />
                  </Button>
                ) : null,
            },
          ]}
        />
      </PageSection>
    </>
  );
}
