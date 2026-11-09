import { useEffect, useState } from 'react';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import { Badge } from '../../components/ui/Badge';
import { Button, IconButton } from '../../components/ui/Button';
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
import { API } from '../../lib/httpSurface';

function blankForm() {
  return { name: '', code: '', status: 'ativa' };
}

function rowToForm(row) {
  return {
    name: row.name || '',
    code: row.code || '',
    status: row.status || 'ativa',
  };
}

export function SettingsCostCentersPage() {
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
      setRows(await api(API.financeCostCenters));
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
      notify('Informe o nome do centro de custo.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        status: form.status,
      };
      if (editingId) {
        await api(API.financeCostCenter(editingId), {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        notify('Centro de custo atualizado.', 'success');
      } else {
        await api(API.financeCostCenters, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notify('Centro de custo criado.', 'success');
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
          Novo centro de custo
        </Button>
      </div>
      <PageSection title="Centros de custo" delay={1} flush>
        <DataTable
          flush
          loading={loading}
          rows={rows}
          onRowClick={setDetail}
          emptyMessage="Nenhum centro de custo cadastrado."
          columns={[
            {
              key: 'name',
              label: 'Nome',
              primary: true,
              secondary: (row) => row.code || '',
            },
            {
              key: 'code',
              label: 'Código',
              narrow: true,
              muted: true,
              render: (row) => row.code || '',
            },
            {
              key: 'status',
              label: 'Status',
              narrow: true,
              render: (row) => (
                <Badge tone={row.status === 'ativa' ? 'ok' : 'neutral'}>
                  {row.status === 'ativa' ? 'Ativo' : 'Inativo'}
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
        title={detail?.name || 'Centro de custo'}
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
              <DetailGrid columns={1}>
                <DetailItem label="Nome" value={detail.name} />
                <DetailItem label="Código" value={detail.code} />
                <DetailItem
                  label="Status"
                  value={detail.status === 'ativa' ? 'Ativo' : 'Inativo'}
                />
              </DetailGrid>
            </DetailSection>
          </DetailView>
        ) : null}
      </Modal>

      <Modal
        open={modalOpen}
        title={editingId ? 'Editar centro de custo' : 'Novo centro de custo'}
        onClose={closeModal}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button form="cost-center-form" type="submit" disabled={saving}>
              <BusyLabel active={saving} idle="Salvar" />
            </Button>
          </>
        }
      >
        <form id="cost-center-form" onSubmit={onSave} className="stack-tight">
          <TextField
            label="Nome"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            label="Código"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            hint="Opcional"
          />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="ativa">Ativo</option>
            <option value="inativa">Inativo</option>
          </SelectField>
        </form>
      </Modal>
    </>
  );
}
