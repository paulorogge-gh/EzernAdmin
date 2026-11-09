import { useEffect, useMemo, useState } from 'react';
import { IconPlayerPlay, IconPlus, IconX } from '@tabler/icons-react';
import { Badge } from '../../components/ui/Badge';
import { Button, IconButton } from '../../components/ui/Button';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { DataTable } from '../../components/ui/DataTable';
import { DateInput } from '../../components/ui/DateInput';
import { SelectField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { PageSection } from '../../components/ui/Page';
import { BusyLabel } from '../../components/ui/Processing';
import { useNotify } from '../../contexts/NotifyContext';
import { api } from '../../lib/api';
import { dateBr, moneyBr } from '../../lib/financeLabels';
import { API } from '../../lib/httpSurface';
import { displayPartyName } from '../../lib/partyForm';

const STATUS_TONE = {
  draft: 'neutral',
  active: 'ok',
  paused: 'warn',
  cancelled: 'danger',
};

function blankItem() {
  return {
    itemType: 'servico',
    description: '',
    quantity: '1',
    amount: '',
    costAmount: '',
    supplierPartyId: '',
    passThrough: false,
    passThroughFrequency: 'each_cycle',
  };
}

function blankForm() {
  return {
    partyId: '',
    fiscalServiceId: '',
    kind: 'recurring',
    cycle: 'MONTHLY',
    nextDueDate: new Date().toISOString().slice(0, 10),
    nfDescription: 'Serviços de suporte técnico',
    items: [blankItem()],
  };
}

export function BillingContractsPage() {
  const { notify } = useNotify();
  const [rows, setRows] = useState([]);
  const [parties, setParties] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState(null);

  const customers = useMemo(
    () => parties.filter((p) => p.isCustomer && p.status === 'ACTIVE'),
    [parties],
  );
  const suppliers = useMemo(
    () => parties.filter((p) => p.isSupplier && p.status === 'ACTIVE'),
    [parties],
  );

  async function load() {
    setLoading(true);
    try {
      const [contracts, partyRows, serviceRows] = await Promise.all([
        api(API.billingContracts),
        api(API.parties),
        api(API.billingServices),
      ]);
      setRows(Array.isArray(contracts) ? contracts : []);
      setParties(Array.isArray(partyRows) ? partyRows : []);
      setServices(Array.isArray(serviceRows) ? serviceRows.filter((s) => s.status === 'ativo') : []);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setForm(blankForm());
    setModalOpen(true);
  }

  function updateItem(index, patch) {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  async function onSave(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api(API.billingContracts, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          items: form.items.map((item) => ({
            ...item,
            quantity: Number(item.quantity || 1),
            amount: Number(item.amount || 0),
            costAmount: Number(item.costAmount || 0),
            passThrough: item.itemType === 'reembolso' || item.passThrough,
            supplierPartyId: item.supplierPartyId || null,
          })),
        }),
      });
      notify('Contrato criado em rascunho.', 'success');
      setModalOpen(false);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function activate(row) {
    setActingId(row.id);
    try {
      await api(API.billingContractActivate(row.id), { method: 'POST', body: '{}' });
      notify('Contrato ativado no Asaas.', 'success');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setActingId(null);
    }
  }

  async function cancel(row) {
    setActingId(row.id);
    try {
      await api(API.billingContractCancel(row.id), { method: 'POST', body: '{}' });
      notify('Contrato cancelado.', 'success');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setActingId(null);
    }
  }

  return (
    <>
      <PageSection
        title="Contratos"
        actions={
          <Button type="button" onClick={openCreate}>
            <IconPlus size={16} stroke={1.75} />
            Novo contrato
          </Button>
        }
        flush
      >
        <DataTable
          flush
          loading={loading}
          rows={rows}
          emptyMessage="Nenhum contrato de faturamento."
          columns={[
            {
              key: 'party',
              label: 'Cliente',
              render: (row) => (
                <div>
                  <span className="data-table__primary">
                    {displayPartyName(row.party) || row.partyId}
                  </span>
                  {row.nfDescription ? (
                    <span className="data-table__secondary">{row.nfDescription}</span>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'kind',
              label: 'Tipo',
              narrow: true,
              render: (row) =>
                row.kind === 'one_shot' ? 'Avulso' : `Recorrente (${row.cycle || '-'})`,
            },
            {
              key: 'totalAmount',
              label: 'Valor',
              narrow: true,
              render: (row) => moneyBr(row.totalAmount),
            },
            {
              key: 'nextDueDate',
              label: 'Próx. venc.',
              narrow: true,
              render: (row) => dateBr(row.nextDueDate),
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
              key: 'actions',
              label: 'Ações',
              actions: true,
              render: (row) => (
                <>
                  {row.status === 'draft' ? (
                    <IconButton
                      title="Ativar"
                      aria-label="Ativar"
                      disabled={actingId === row.id}
                      onClick={() => void activate(row)}
                    >
                      <IconPlayerPlay size={16} stroke={1.75} />
                    </IconButton>
                  ) : null}
                  {row.status === 'active' ? (
                    <IconButton
                      danger
                      title="Cancelar"
                      aria-label="Cancelar"
                      disabled={actingId === row.id}
                      onClick={() => void cancel(row)}
                    >
                      <IconX size={16} stroke={1.75} />
                    </IconButton>
                  ) : null}
                </>
              ),
            },
          ]}
        />
      </PageSection>

      <Modal
        open={modalOpen}
        title="Novo contrato"
        wide
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button form="billing-contract-form" type="submit" disabled={saving}>
              <BusyLabel active={saving} idle="Salvar rascunho" />
            </Button>
          </>
        }
      >
        <form id="billing-contract-form" className="stack-tight tx-form" onSubmit={onSave}>
          <div className="form-grid-2">
            <SelectField
              label="Cliente"
              required
              value={form.partyId}
              onChange={(e) => setForm((f) => ({ ...f, partyId: e.target.value }))}
              options={[
                { value: '', label: 'Selecione' },
                ...customers.map((p) => ({ value: p.id, label: displayPartyName(p) })),
              ]}
            />
            <SelectField
              label="Serviço fiscal (NFS-e / Simples)"
              required
              value={form.fiscalServiceId}
              onChange={(e) => {
                const svc = services.find((s) => s.id === e.target.value);
                setForm((f) => ({
                  ...f,
                  fiscalServiceId: e.target.value,
                  nfDescription: svc?.nfDescription || f.nfDescription,
                }));
              }}
              options={[
                { value: '', label: 'Selecione' },
                ...services.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>
          <div className="form-grid-3">
            <SelectField
              label="Tipo"
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
              options={[
                { value: 'recurring', label: 'Recorrente' },
                { value: 'one_shot', label: 'Avulso' },
              ]}
            />
            {form.kind === 'recurring' ? (
              <SelectField
                label="Periodicidade"
                value={form.cycle}
                onChange={(e) => setForm((f) => ({ ...f, cycle: e.target.value }))}
                options={[
                  { value: 'WEEKLY', label: 'Semanal' },
                  { value: 'MONTHLY', label: 'Mensal' },
                  { value: 'YEARLY', label: 'Anual' },
                ]}
              />
            ) : (
              <div />
            )}
            <DateInput
              label="Primeiro vencimento"
              required
              value={form.nextDueDate}
              onChange={(e) => setForm((f) => ({ ...f, nextDueDate: e.target.value }))}
            />
          </div>
          <TextField
            label="Descrição na NFS-e / boleto"
            value={form.nfDescription}
            onChange={(e) => setForm((f) => ({ ...f, nfDescription: e.target.value }))}
          />

          <div className="stack-tight">
            <div className="block-header" style={{ padding: 0, border: 0, background: 'transparent', boxShadow: 'none' }}>
              <h3 className="block-header__title">Itens da fatura interna</h3>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setForm((f) => ({ ...f, items: [...f.items, blankItem()] }))}
              >
                <IconPlus size={16} stroke={1.75} />
                Item
              </Button>
            </div>
            {form.items.map((item, index) => (
              <div key={index} className="form-grid-2" style={{ alignItems: 'end' }}>
                <SelectField
                  label="Tipo"
                  value={item.itemType}
                  onChange={(e) =>
                    updateItem(index, {
                      itemType: e.target.value,
                      passThrough: e.target.value === 'reembolso',
                    })
                  }
                  options={[
                    { value: 'servico', label: 'Serviço' },
                    { value: 'reembolso', label: 'Reembolso' },
                    { value: 'taxa', label: 'Taxa' },
                    { value: 'outro', label: 'Outro' },
                  ]}
                />
                <TextField
                  label="Descrição"
                  required
                  value={item.description}
                  onChange={(e) => updateItem(index, { description: e.target.value })}
                />
                <CurrencyInput
                  label="Valor cobrado"
                  required
                  value={item.amount}
                  onChange={(e) => updateItem(index, { amount: e.target.value })}
                />
                {item.itemType === 'reembolso' ? (
                  <>
                    <CurrencyInput
                      label="Custo (AP)"
                      value={item.costAmount}
                      onChange={(e) => updateItem(index, { costAmount: e.target.value })}
                    />
                    <SelectField
                      label="Fornecedor"
                      value={item.supplierPartyId}
                      onChange={(e) => updateItem(index, { supplierPartyId: e.target.value })}
                      options={[
                        { value: '', label: 'Selecione' },
                        ...suppliers.map((p) => ({ value: p.id, label: displayPartyName(p) })),
                      ]}
                    />
                    <SelectField
                      label="Frequência do custo"
                      value={item.passThroughFrequency}
                      onChange={(e) =>
                        updateItem(index, { passThroughFrequency: e.target.value })
                      }
                      options={[
                        { value: 'each_cycle', label: 'Cada ciclo' },
                        { value: 'once', label: 'Somente uma vez' },
                      ]}
                    />
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </form>
      </Modal>
    </>
  );
}
