import { useEffect, useMemo, useState } from 'react';
import {
  IconLock,
  IconLockOpen,
  IconRefresh,
  IconRotate,
  IconCash,
} from '@tabler/icons-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { DateInput } from '../components/ui/DateInput';
import {
  DetailGrid,
  DetailItem,
  DetailList,
  DetailListItem,
  DetailSection,
  DetailView,
} from '../components/ui/DetailView';
import { SelectField } from '../components/ui/Field';
import { FilterChips, ListToolbar } from '../components/ui/ListToolbar';
import { ConfirmModal, Modal } from '../components/ui/Modal';
import { PageHeader, PageSection } from '../components/ui/Page';
import { BusyLabel } from '../components/ui/Processing';
import { useNotify } from '../contexts/NotifyContext';
import { api } from '../lib/api';
import {
  INVOICE_STATUS_OPTIONS,
  INVOICE_STATUS_TONE,
  dateBr,
  labelOf,
  moneyBr,
} from '../lib/financeLabels';
import { API } from '../lib/httpSurface';
import { displayPartyName } from '../lib/partyForm';

const STATUS_FILTER = [{ value: '', label: 'Todas' }, ...INVOICE_STATUS_OPTIONS];

export function InvoicesPage() {
  const { notify } = useNotify();
  const [rows, setRows] = useState([]);
  const [cards, setCards] = useState([]);
  const [parties, setParties] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardFilter, setCardFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    paidAt: new Date().toISOString().slice(0, 10),
    partyId: '',
    costCenterId: '',
  });
  const [paying, setPaying] = useState(false);
  const [acting, setActing] = useState(false);
  const [unpayTarget, setUnpayTarget] = useState(null);
  const [maintaining, setMaintaining] = useState(false);

  async function loadMasters() {
    try {
      const [cds, pts, ccs] = await Promise.all([
        api(API.financeCards),
        api(API.parties),
        api(API.financeCostCenters),
      ]);
      setCards((cds || []).filter((c) => c.type === 'credito'));
      setParties(pts || []);
      setCostCenters(ccs || []);
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cardFilter) params.set('cardId', cardFilter);
      if (statusFilter) params.set('status', statusFilter);
      const query = params.toString() ? `?${params.toString()}` : '';
      setRows(await api(`${API.financeInvoices}${query}`));
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMasters();
  }, []);

  useEffect(() => {
    void load();
  }, [cardFilter, statusFilter]);

  const supplierOptions = useMemo(
    () =>
      parties
        .filter((p) => p.status === 'ACTIVE' && p.isSupplier)
        .map((p) => ({ value: p.id, label: displayPartyName(p) })),
    [parties],
  );

  const costCenterOptions = useMemo(
    () =>
      costCenters
        .filter((c) => c.status === 'ativa')
        .map((c) => ({
          value: c.id,
          label: c.code ? `${c.code} · ${c.name}` : c.name,
        })),
    [costCenters],
  );

  const cardOptions = useMemo(
    () => cards.map((c) => ({ value: c.id, label: c.name })),
    [cards],
  );

  async function openDetail(row) {
    setDetailLoading(true);
    setDetail(row);
    try {
      const data = await api(API.financeInvoice(row.id));
      setDetail(data);
    } catch (err) {
      notify(err.message, 'error');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function maintain() {
    setMaintaining(true);
    try {
      await api(API.financeInvoiceMaintain, { method: 'POST', body: JSON.stringify({}) });
      notify('Faturas futuras atualizadas.', 'success');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setMaintaining(false);
    }
  }

  function openPay() {
    setPayForm({
      paidAt: new Date().toISOString().slice(0, 10),
      partyId: '',
      costCenterId: '',
    });
    setPayOpen(true);
  }

  async function onPay(event) {
    event.preventDefault();
    if (!detail) return;
    if (!payForm.partyId || !payForm.costCenterId) {
      notify('Informe fornecedor e centro de custo.', 'error');
      return;
    }
    setPaying(true);
    try {
      const data = await api(API.financeInvoicePay(detail.id), {
        method: 'POST',
        body: JSON.stringify(payForm),
      });
      setDetail(data);
      setPayOpen(false);
      notify('Fatura paga.', 'success');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setPaying(false);
    }
  }

  async function confirmUnpay() {
    if (!unpayTarget) return;
    setActing(true);
    try {
      const data = await api(API.financeInvoiceUnpay(unpayTarget.id), { method: 'POST' });
      setUnpayTarget(null);
      setDetail(data);
      notify('Pagamento desfeito.', 'success');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setActing(false);
    }
  }

  async function closeInvoice() {
    if (!detail) return;
    setActing(true);
    try {
      const data = await api(API.financeInvoiceClose(detail.id), { method: 'POST' });
      setDetail(data);
      notify('Fatura fechada.', 'success');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setActing(false);
    }
  }

  async function reopenInvoice() {
    if (!detail) return;
    setActing(true);
    try {
      const data = await api(API.financeInvoiceReopen(detail.id), { method: 'POST' });
      setDetail(data);
      notify('Fatura reaberta.', 'success');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setActing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Faturas"
        description="Faturas de cartão de crédito da empresa."
        actions={
          <Button type="button" onClick={() => void maintain()} disabled={maintaining}>
            <IconRefresh size={16} stroke={1.75} />
            <BusyLabel active={maintaining} idle="Atualizar faturas" />
          </Button>
        }
      />

      <ListToolbar>
        <SelectField
          label="Cartão"
          value={cardFilter}
          onChange={(e) => setCardFilter(e.target.value)}
          options={[{ value: '', label: 'Todos' }, ...cardOptions]}
        />
        <FilterChips
          label="Status"
          value={statusFilter}
          options={STATUS_FILTER}
          onChange={setStatusFilter}
        />
      </ListToolbar>

      <PageSection title="Faturas" delay={1} flush>
        <DataTable
          flush
          loading={loading}
          rows={rows}
          onRowClick={(row) => void openDetail(row)}
          emptyMessage="Nenhuma fatura encontrada."
          columns={[
            {
              key: 'label',
              label: 'Referência',
              primary: true,
              secondary: (row) => row.card?.name || '',
            },
            {
              key: 'closingDate',
              label: 'Fechamento',
              narrow: true,
              render: (row) => dateBr(row.closingDate),
            },
            {
              key: 'dueDate',
              label: 'Vencimento',
              narrow: true,
              render: (row) => dateBr(row.dueDate),
            },
            {
              key: 'total',
              label: 'Total',
              narrow: true,
              render: (row) => moneyBr(row.totalAmount),
            },
            {
              key: 'status',
              label: 'Status',
              narrow: true,
              render: (row) => (
                <Badge tone={INVOICE_STATUS_TONE[row.status] || 'neutral'}>
                  {labelOf(INVOICE_STATUS_OPTIONS, row.status)}
                </Badge>
              ),
            },
          ]}
        />
      </PageSection>

      <Modal
        open={Boolean(detail)}
        title={
          detail
            ? `${detail.card?.name || 'Cartão'} · ${detail.label || ''}`
            : 'Fatura'
        }
        wide
        onClose={() => setDetail(null)}
        footer={
          detail && !detailLoading ? (
            <>
              <Button variant="ghost" onClick={() => setDetail(null)}>
                Fechar
              </Button>
              {detail.status === 'aberta' ? (
                <Button variant="ghost" disabled={acting} onClick={() => void closeInvoice()}>
                  <IconLock size={16} stroke={1.75} />
                  Fechar fatura
                </Button>
              ) : null}
              {detail.status === 'fechada' ? (
                <Button variant="ghost" disabled={acting} onClick={() => void reopenInvoice()}>
                  <IconLockOpen size={16} stroke={1.75} />
                  Reabrir
                </Button>
              ) : null}
              {detail.status === 'paga' ? (
                <Button
                  variant="ghost"
                  disabled={acting}
                  onClick={() => setUnpayTarget(detail)}
                >
                  <IconRotate size={16} stroke={1.75} />
                  Desfazer pagamento
                </Button>
              ) : null}
              {detail.status !== 'paga' ? (
                <Button type="button" disabled={acting} onClick={openPay}>
                  <IconCash size={16} stroke={1.75} />
                  Pagar
                </Button>
              ) : null}
            </>
          ) : null
        }
      >
        {detail ? (
          <DetailView>
            <DetailSection title="Resumo">
              <DetailGrid>
                <DetailItem label="Cartão" value={detail.card?.name} />
                <DetailItem label="Referência" value={detail.label} />
                <DetailItem label="Fechamento" value={dateBr(detail.closingDate)} />
                <DetailItem label="Vencimento" value={dateBr(detail.dueDate)} />
                <DetailItem
                  label="Status"
                  value={labelOf(INVOICE_STATUS_OPTIONS, detail.status)}
                />
                <DetailItem label="Total" value={moneyBr(detail.totalAmount)} />
                <DetailItem label="Pago em" value={dateBr(detail.paidAt)} />
              </DetailGrid>
            </DetailSection>
            <DetailSection title="Lançamentos">
              {detailLoading ? (
                <p className="detail-item__value is-empty">Carregando itens...</p>
              ) : detail.items?.length ? (
                <DetailList>
                  {detail.items.map((item) => (
                    <DetailListItem
                      key={item.id}
                      title={item.description}
                      meta={`${dateBr(item.dueDate)} · ${labelOf(
                        [
                          { value: 'despesa', label: 'Despesa' },
                          { value: 'receita', label: 'Receita' },
                        ],
                        item.type,
                      )}`}
                      badge={
                        <span
                          className={
                            item.type === 'receita' ? 'text-success' : 'text-danger'
                          }
                        >
                          {moneyBr(item.amount)}
                        </span>
                      }
                    />
                  ))}
                </DetailList>
              ) : (
                <p className="detail-item__value is-empty">Nenhum lançamento nesta fatura.</p>
              )}
            </DetailSection>
          </DetailView>
        ) : null}
      </Modal>

      <Modal
        open={payOpen}
        title="Pagar fatura"
        onClose={() => setPayOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayOpen(false)} disabled={paying}>
              Cancelar
            </Button>
            <Button form="invoice-pay-form" type="submit" disabled={paying}>
              <BusyLabel active={paying} idle="Confirmar pagamento" />
            </Button>
          </>
        }
      >
        <form id="invoice-pay-form" onSubmit={onPay} className="stack-tight">
          <p className="modal-copy">
            Total a pagar: <strong>{moneyBr(detail?.totalAmount)}</strong>
          </p>
          <DateInput
            label="Data do pagamento"
            required
            value={payForm.paidAt}
            onChange={(e) => setPayForm((f) => ({ ...f, paidAt: e.target.value }))}
          />
          <SelectField
            label="Fornecedor (operadora/banco)"
            required
            value={payForm.partyId}
            onChange={(e) => setPayForm((f) => ({ ...f, partyId: e.target.value }))}
            options={[{ value: '', label: 'Selecione' }, ...supplierOptions]}
          />
          <SelectField
            label="Centro de custo"
            required
            value={payForm.costCenterId}
            onChange={(e) => setPayForm((f) => ({ ...f, costCenterId: e.target.value }))}
            options={[{ value: '', label: 'Selecione' }, ...costCenterOptions]}
          />
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(unpayTarget)}
        title="Desfazer pagamento"
        confirmLabel="Desfazer"
        danger
        loading={acting}
        onClose={() => setUnpayTarget(null)}
        onConfirm={() => void confirmUnpay()}
      >
        O lançamento de pagamento da fatura será removido e os itens voltarão a pendente.
      </ConfirmModal>
    </div>
  );
}
