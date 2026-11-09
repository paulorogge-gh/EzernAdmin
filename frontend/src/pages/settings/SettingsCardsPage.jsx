import { useEffect, useState } from 'react';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import { Badge } from '../../components/ui/Badge';
import { Button, IconButton } from '../../components/ui/Button';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { DataTable } from '../../components/ui/DataTable';
import {
  DetailGrid,
  DetailItem,
  DetailSection,
  DetailView,
} from '../../components/ui/DetailView';
import { SelectField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { PageSection } from '../../components/ui/Page';
import { BusyLabel } from '../../components/ui/Processing';
import { useNotify } from '../../contexts/NotifyContext';
import { api } from '../../lib/api';
import {
  CARD_BRAND_OPTIONS,
  CARD_TYPE_OPTIONS,
  labelOf,
  moneyBr,
} from '../../lib/financeLabels';
import { API } from '../../lib/httpSurface';

const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

function blankForm() {
  return {
    name: '',
    type: 'credito',
    brand: 'visa',
    accountId: '',
    closingDay: '10',
    dueDay: '17',
    creditLimit: '',
    status: 'ativo',
  };
}

function rowToForm(row) {
  return {
    name: row.name || '',
    type: row.type || 'credito',
    brand: row.brand || 'visa',
    accountId: row.accountId || '',
    closingDay: row.closingDay ? String(row.closingDay) : '10',
    dueDay: row.dueDay ? String(row.dueDay) : '17',
    creditLimit: row.creditLimit != null ? String(row.creditLimit) : '',
    status: row.status || 'ativo',
  };
}

export function SettingsCardsPage() {
  const { notify } = useNotify();
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [cards, accs] = await Promise.all([
        api(API.financeCards),
        api(API.financeAccounts),
      ]);
      setRows(cards);
      setAccounts(accs);
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
    setDetail(null);
    setEditingId(null);
    setForm(blankForm());
    setModalOpen(true);
  }

  function openEdit(row) {
    setDetail(null);
    setEditingId(row.id);
    setForm(rowToForm(row));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(blankForm());
  }

  async function onSave(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      notify('Informe o nome do cartão.', 'error');
      return;
    }
    if (!form.accountId) {
      notify('Vincule uma conta.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        brand: form.brand || null,
        accountId: form.accountId,
        closingDay: form.type === 'credito' ? Number(form.closingDay) : null,
        dueDay: form.type === 'credito' ? Number(form.dueDay) : null,
        creditLimit:
          form.type === 'credito' && form.creditLimit !== ''
            ? Number(form.creditLimit)
            : null,
        status: form.status,
      };
      if (editingId) {
        await api(API.financeCard(editingId), {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        notify('Cartão atualizado.', 'success');
      } else {
        await api(API.financeCards, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notify('Cartão criado.', 'success');
      }
      closeModal();
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const accountOptions = accounts
    .filter((a) => a.status === 'ativa' || a.id === form.accountId)
    .map((a) => ({ value: a.id, label: a.name }));

  return (
    <>
      <div className="settings-toolbar">
        <Button type="button" onClick={openCreate}>
          <IconPlus size={16} stroke={1.75} />
          Novo cartão
        </Button>
      </div>
      <PageSection title="Cartões" delay={1} flush>
        <DataTable
          flush
          loading={loading}
          rows={rows}
          onRowClick={setDetail}
          emptyMessage="Nenhum cartão cadastrado."
          columns={[
            {
              key: 'name',
              label: 'Cartão',
              primary: true,
              secondary: (row) => row.account?.name || '',
            },
            {
              key: 'type',
              label: 'Tipo',
              narrow: true,
              render: (row) => labelOf(CARD_TYPE_OPTIONS, row.type),
            },
            {
              key: 'brand',
              label: 'Bandeira',
              narrow: true,
              render: (row) => labelOf(CARD_BRAND_OPTIONS, row.brand) || row.brand || '',
            },
            {
              key: 'status',
              label: 'Status',
              narrow: true,
              render: (row) => (
                <Badge tone={row.status === 'ativo' ? 'ok' : 'neutral'}>
                  {row.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </Badge>
              ),
            },
            {
              key: 'actions',
              label: 'Ações',
              actions: true,
              render: (row) => (
                <IconButton title="Editar" aria-label="Editar" onClick={() => openEdit(row)}>
                  <IconPencil size={16} stroke={1.75} />
                </IconButton>
              ),
            },
          ]}
        />
      </PageSection>

      <Modal
        open={Boolean(detail)}
        title={detail?.name || 'Cartão'}
        wide
        onClose={() => setDetail(null)}
        footer={
          detail ? (
            <>
              <Button variant="ghost" onClick={() => setDetail(null)}>
                Fechar
              </Button>
              <Button type="button" onClick={() => openEdit(detail)}>
                <IconPencil size={16} stroke={1.75} />
                Editar
              </Button>
            </>
          ) : null
        }
      >
        {detail ? (
          <DetailView>
            <DetailSection title="Identificação">
              <DetailGrid>
                <DetailItem label="Nome" value={detail.name} />
                <DetailItem label="Tipo" value={labelOf(CARD_TYPE_OPTIONS, detail.type)} />
                <DetailItem
                  label="Bandeira"
                  value={labelOf(CARD_BRAND_OPTIONS, detail.brand) || detail.brand}
                />
                <DetailItem label="Conta" value={detail.account?.name} />
                <DetailItem
                  label="Status"
                  value={detail.status === 'ativo' ? 'Ativo' : 'Inativo'}
                />
              </DetailGrid>
            </DetailSection>
            {detail.type === 'credito' ? (
              <DetailSection title="Crédito">
                <DetailGrid>
                  <DetailItem label="Fechamento" value={detail.closingDay} />
                  <DetailItem label="Vencimento" value={detail.dueDay} />
                  <DetailItem
                    label="Limite"
                    value={detail.creditLimit != null ? moneyBr(detail.creditLimit) : null}
                  />
                </DetailGrid>
              </DetailSection>
            ) : null}
          </DetailView>
        ) : null}
      </Modal>

      <Modal
        open={modalOpen}
        title={editingId ? 'Editar cartão' : 'Novo cartão'}
        wide
        onClose={closeModal}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button form="card-form" type="submit" disabled={saving}>
              <BusyLabel active={saving} idle="Salvar" />
            </Button>
          </>
        }
      >
        <form id="card-form" onSubmit={onSave} className="stack-tight">
          <TextField
            label="Nome"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div className="form-grid-2">
            <SelectField
              label="Tipo"
              value={form.type}
              disabled={Boolean(editingId)}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              options={CARD_TYPE_OPTIONS}
            />
            <SelectField
              label="Bandeira"
              value={form.brand}
              onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
              options={CARD_BRAND_OPTIONS}
            />
          </div>
          <SelectField
            label="Conta vinculada"
            required
            value={form.accountId}
            onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
            options={[{ value: '', label: 'Selecione' }, ...accountOptions]}
          />
          {form.type === 'credito' ? (
            <>
              <div className="form-grid-2">
                <SelectField
                  label="Dia de fechamento"
                  value={form.closingDay}
                  onChange={(e) => setForm((f) => ({ ...f, closingDay: e.target.value }))}
                  options={DAY_OPTIONS}
                />
                <SelectField
                  label="Dia de vencimento"
                  value={form.dueDay}
                  onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))}
                  options={DAY_OPTIONS}
                />
              </div>
              <CurrencyInput
                label="Limite"
                value={form.creditLimit}
                onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
              />
            </>
          ) : null}
          <SelectField
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </SelectField>
        </form>
      </Modal>
    </>
  );
}
