import { useEffect, useState } from 'react';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import { Badge } from '../../components/ui/Badge';
import { Button, IconButton } from '../../components/ui/Button';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { DataTable } from '../../components/ui/DataTable';
import { SelectField, TextField, TextareaField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { PageSection } from '../../components/ui/Page';
import { BusyLabel } from '../../components/ui/Processing';
import { SwitchField } from '../../components/ui/SwitchField';
import { useNotify } from '../../contexts/NotifyContext';
import { api } from '../../lib/api';
import { moneyBr } from '../../lib/financeLabels';
import { API } from '../../lib/httpSurface';

function blankForm() {
  return {
    name: '',
    description: '',
    nfDescription: 'Serviços de suporte técnico',
    unitPrice: '',
    status: 'ativo',
    cnae: '',
    municipalServiceId: '',
    municipalServiceCode: '',
    municipalServiceName: '',
    simplesAnexo: 'V',
    fatorREligible: true,
    issRetained: false,
  };
}

export function BillingServicesPage() {
  const { notify } = useNotify();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRows(await api(API.billingServices));
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
    setEditingId(null);
    setForm(blankForm());
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditingId(row.id);
    setForm({
      ...blankForm(),
      ...row,
      unitPrice: row.unitPrice != null ? String(row.unitPrice) : '',
    });
    setModalOpen(true);
  }

  async function onSave(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        unitPrice: Number(form.unitPrice || 0),
      };
      if (editingId) {
        await api(API.billingService(editingId), {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        notify('Serviço atualizado.', 'success');
      } else {
        await api(API.billingServices, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notify('Serviço criado.', 'success');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageSection
        title="Serviços"
        actions={
          <Button type="button" onClick={openCreate}>
            <IconPlus size={16} stroke={1.75} />
            Novo serviço
          </Button>
        }
        flush
      >
        <DataTable
          flush
          loading={loading}
          rows={rows}
          emptyMessage="Nenhum serviço cadastrado."
          columns={[
            { key: 'name', label: 'Nome', primary: true },
            {
              key: 'simplesAnexo',
              label: 'Anexo',
              narrow: true,
              render: (row) => `Anexo ${row.simplesAnexo}`,
            },
            {
              key: 'unitPrice',
              label: 'Preço',
              narrow: true,
              render: (row) => moneyBr(row.unitPrice),
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
        open={modalOpen}
        title={editingId ? 'Editar serviço' : 'Novo serviço'}
        wide
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button form="billing-service-form" type="submit" disabled={saving}>
              <BusyLabel active={saving} idle="Salvar" />
            </Button>
          </>
        }
      >
        <form id="billing-service-form" className="stack-tight tx-form" onSubmit={onSave}>
          <TextField
            label="Nome"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextareaField
            label="Descrição interna"
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <TextField
            label="Descrição na NFS-e"
            value={form.nfDescription}
            onChange={(e) => setForm((f) => ({ ...f, nfDescription: e.target.value }))}
          />
          <div className="form-grid-3">
            <CurrencyInput
              label="Preço base"
              value={form.unitPrice}
              onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
            />
            <SelectField
              label="Anexo Simples"
              value={form.simplesAnexo}
              onChange={(e) => setForm((f) => ({ ...f, simplesAnexo: e.target.value }))}
              options={[
                { value: 'III', label: 'Anexo III' },
                { value: 'V', label: 'Anexo V' },
              ]}
            />
            <SelectField
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              options={[
                { value: 'ativo', label: 'Ativo' },
                { value: 'inativo', label: 'Inativo' },
              ]}
            />
          </div>
          <div className="form-grid-3">
            <TextField
              label="CNAE"
              value={form.cnae}
              onChange={(e) => setForm((f) => ({ ...f, cnae: e.target.value }))}
            />
            <TextField
              label="Código serviço municipal"
              value={form.municipalServiceCode}
              onChange={(e) => setForm((f) => ({ ...f, municipalServiceCode: e.target.value }))}
            />
            <TextField
              label="ID serviço municipal Asaas"
              value={form.municipalServiceId}
              onChange={(e) => setForm((f) => ({ ...f, municipalServiceId: e.target.value }))}
            />
          </div>
          <TextField
            label="Nome serviço municipal"
            value={form.municipalServiceName}
            onChange={(e) => setForm((f) => ({ ...f, municipalServiceName: e.target.value }))}
          />
          <SwitchField
            label="Elegível ao Fator R (pode ir para Anexo III)"
            checked={form.fatorREligible}
            onChange={(checked) => setForm((f) => ({ ...f, fatorREligible: checked }))}
          />
        </form>
      </Modal>
    </>
  );
}
