import { useEffect, useState } from 'react';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import { Badge } from '../../components/ui/Badge';
import { Button, IconButton } from '../../components/ui/Button';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { DataTable } from '../../components/ui/DataTable';
import { DateInput } from '../../components/ui/DateInput';
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
import { SwitchField } from '../../components/ui/SwitchField';
import { useNotify } from '../../contexts/NotifyContext';
import { api } from '../../lib/api';
import { BRAZILIAN_BANK_OPTIONS, findBankByCode } from '../../lib/brazilianBanks';
import {
  ACCOUNT_TYPE_OPTIONS,
  dateBr,
  labelOf,
  moneyBr,
} from '../../lib/financeLabels';
import { API } from '../../lib/httpSurface';

function blankForm() {
  return {
    name: '',
    type: 'corrente',
    institutionCode: '',
    institutionName: '',
    agency: '',
    accountNumber: '',
    initialBalance: '',
    initialBalanceDate: new Date().toISOString().slice(0, 10),
    status: 'ativa',
    includeInConsolidated: true,
  };
}

function rowToForm(row) {
  return {
    name: row.name || '',
    type: row.type || 'corrente',
    institutionCode: row.institutionCode || '',
    institutionName: row.institutionName || '',
    agency: row.agency || '',
    accountNumber: row.accountNumber || '',
    initialBalance: row.initialBalance != null ? String(row.initialBalance) : '',
    initialBalanceDate: row.initialBalanceDate || new Date().toISOString().slice(0, 10),
    status: row.status || 'ativa',
    includeInConsolidated: row.includeInConsolidated !== false,
  };
}

export function SettingsAccountsPage() {
  const { notify } = useNotify();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await api(API.financeAccounts));
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
      notify('Informe o nome da conta.', 'error');
      return;
    }
    setSaving(true);
    try {
      const bank = findBankByCode(form.institutionCode);
      const payload = {
        name: form.name.trim(),
        type: form.type,
        institutionCode: form.institutionCode || null,
        institutionName: bank?.name || form.institutionName || null,
        agency: form.agency || null,
        accountNumber: form.accountNumber || null,
        initialBalance: form.initialBalance === '' ? 0 : Number(form.initialBalance),
        initialBalanceDate: form.initialBalanceDate,
        status: form.status,
        includeInConsolidated: form.includeInConsolidated,
      };
      if (editingId) {
        await api(API.financeAccount(editingId), {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        notify('Conta atualizada.', 'success');
      } else {
        await api(API.financeAccounts, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notify('Conta criada.', 'success');
      }
      closeModal();
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="settings-toolbar">
        <Button type="button" onClick={openCreate}>
          <IconPlus size={16} stroke={1.75} />
          Nova conta
        </Button>
      </div>
      <PageSection title="Contas" delay={1} flush>
        <DataTable
          flush
          loading={loading}
          rows={rows}
          onRowClick={setDetail}
          emptyMessage="Nenhuma conta cadastrada."
          columns={[
            {
              key: 'name',
              label: 'Conta',
              primary: true,
              secondary: (row) =>
                [row.institutionName, row.agency && `Ag ${row.agency}`]
                  .filter(Boolean)
                  .join(' · '),
            },
            {
              key: 'type',
              label: 'Tipo',
              narrow: true,
              render: (row) => labelOf(ACCOUNT_TYPE_OPTIONS, row.type),
            },
            {
              key: 'balance',
              label: 'Saldo',
              narrow: true,
              render: (row) => moneyBr(row.currentBalance ?? row.initialBalance),
            },
            {
              key: 'status',
              label: 'Status',
              narrow: true,
              render: (row) => (
                <Badge tone={row.status === 'ativa' ? 'ok' : 'neutral'}>
                  {row.status === 'ativa' ? 'Ativa' : 'Inativa'}
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
        title={detail?.name || 'Conta'}
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
                <DetailItem label="Tipo" value={labelOf(ACCOUNT_TYPE_OPTIONS, detail.type)} />
                <DetailItem label="Instituição" value={detail.institutionName} />
                <DetailItem label="Agência" value={detail.agency} />
                <DetailItem label="Número" value={detail.accountNumber} />
                <DetailItem
                  label="Status"
                  value={detail.status === 'ativa' ? 'Ativa' : 'Inativa'}
                />
              </DetailGrid>
            </DetailSection>
            <DetailSection title="Saldos">
              <DetailGrid>
                <DetailItem label="Saldo inicial" value={moneyBr(detail.initialBalance)} />
                <DetailItem
                  label="Data do saldo inicial"
                  value={dateBr(detail.initialBalanceDate)}
                />
                <DetailItem
                  label="Saldo atual"
                  value={moneyBr(detail.currentBalance ?? detail.initialBalance)}
                />
                <DetailItem
                  label="Consolidado"
                  value={detail.includeInConsolidated ? 'Sim' : 'Não'}
                />
              </DetailGrid>
            </DetailSection>
          </DetailView>
        ) : null}
      </Modal>

      <Modal
        open={modalOpen}
        title={editingId ? 'Editar conta' : 'Nova conta'}
        wide
        onClose={closeModal}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button form="account-form" type="submit" disabled={saving}>
              <BusyLabel active={saving} idle="Salvar" />
            </Button>
          </>
        }
      >
        <form id="account-form" onSubmit={onSave} className="stack-tight">
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
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              options={ACCOUNT_TYPE_OPTIONS}
            />
            <SelectField
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="ativa">Ativa</option>
              <option value="inativa">Inativa</option>
            </SelectField>
          </div>
          <SelectField
            label="Instituição"
            value={form.institutionCode}
            searchable
            onChange={(e) => {
              const code = e.target.value;
              const bank = findBankByCode(code);
              setForm((f) => ({
                ...f,
                institutionCode: code,
                institutionName: bank?.name || '',
              }));
            }}
            options={[
              { value: '', label: 'Sem instituição' },
              ...BRAZILIAN_BANK_OPTIONS,
            ]}
          />
          <div className="form-grid-2">
            <TextField
              label="Agência"
              value={form.agency}
              onChange={(e) => setForm((f) => ({ ...f, agency: e.target.value }))}
            />
            <TextField
              label="Número da conta"
              value={form.accountNumber}
              onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
            />
          </div>
          <div className="form-grid-2">
            <CurrencyInput
              label="Saldo inicial"
              value={form.initialBalance}
              onChange={(e) => setForm((f) => ({ ...f, initialBalance: e.target.value }))}
            />
            <DateInput
              label="Data do saldo inicial"
              required
              value={form.initialBalanceDate}
              onChange={(e) => setForm((f) => ({ ...f, initialBalanceDate: e.target.value }))}
            />
          </div>
          <SwitchField
            label="Incluir no consolidado"
            checked={form.includeInConsolidated}
            onChange={(checked) => setForm((f) => ({ ...f, includeInConsolidated: checked }))}
          />
        </form>
      </Modal>
    </>
  );
}
