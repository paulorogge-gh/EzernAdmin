import { useEffect, useMemo, useState } from 'react';
import {
  IconCheck,
  IconCornerDownRight,
  IconPencil,
  IconPlus,
  IconX,
} from '@tabler/icons-react';
import { Badge } from '../../components/ui/Badge';
import { Button, IconButton } from '../../components/ui/Button';
import { ColorSwatchField } from '../../components/ui/ColorSwatchField';
import { DataTable } from '../../components/ui/DataTable';
import {
  DetailGrid,
  DetailItem,
  DetailSection,
  DetailView,
} from '../../components/ui/DetailView';
import { SelectField, TextField } from '../../components/ui/Field';
import { IconSelect } from '../../components/ui/IconSelect';
import { CategoryGlyph } from '../../components/ui/icons';
import { FilterChips, ListToolbar } from '../../components/ui/ListToolbar';
import { Modal } from '../../components/ui/Modal';
import { PageSection } from '../../components/ui/Page';
import { BusyLabel, Processing } from '../../components/ui/Processing';
import { useNotify } from '../../contexts/NotifyContext';
import { api } from '../../lib/api';
import { API } from '../../lib/httpSurface';

const TYPE_FILTER = [
  { value: '', label: 'Todas' },
  { value: 'despesa', label: 'Despesa' },
  { value: 'receita', label: 'Receita' },
];

function blankForm() {
  return {
    name: '',
    type: 'despesa',
    parentId: '',
    iconKey: 'tag',
    color: '#0f9f90',
    status: 'ativa',
  };
}

function rowToForm(row) {
  return {
    name: row.name || '',
    type: row.type || 'despesa',
    parentId: row.parentId || '',
    iconKey: row.iconKey || 'tag',
    color: row.color || '#0f9f90',
    status: row.status || 'ativa',
  };
}

function CategoryNameCell({ row, onQuickAdd }) {
  const isChild = Boolean(row.parentId);
  return (
    <div className={`category-name-cell ${isChild ? 'is-child' : ''}`.trim()}>
      {isChild ? (
        <IconCornerDownRight
          size={16}
          stroke={1.75}
          className="category-name-cell__branch"
          aria-hidden
        />
      ) : null}
      <CategoryGlyph iconKey={row.iconKey} color={row.color} size={16} />
      <div className="category-name-cell__text">
        <span className={`data-table__primary ${isChild ? 'is-child-name' : ''}`.trim()}>
          {row.name}
        </span>
      </div>
      {!isChild && onQuickAdd ? (
        <IconButton
          type="button"
          className="category-name-cell__add"
          title="Nova subcategoria"
          aria-label="Nova subcategoria"
          onClick={(event) => {
            event.stopPropagation();
            onQuickAdd(row);
          }}
        >
          <IconPlus size={16} stroke={1.75} />
        </IconButton>
      ) : null}
    </div>
  );
}

function QuickAddRow({ parent, value, saving, onChange, onCancel, onSubmit }) {
  return (
    <form
      className="category-quick-add"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <IconCornerDownRight
        size={16}
        stroke={1.75}
        className="category-name-cell__branch"
        aria-hidden
      />
      <CategoryGlyph iconKey={parent.iconKey} color={parent.color} size={16} />
      <input
        className="category-quick-add__input"
        value={value}
        autoFocus
        disabled={saving}
        placeholder={`Nova subcategoria de ${parent.name}`}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
      />
      <IconButton
        type="submit"
        title="Adicionar"
        aria-label="Adicionar subcategoria"
        disabled={saving || !value.trim()}
      >
        {saving ? <Processing active /> : <IconCheck size={16} stroke={1.75} />}
      </IconButton>
      <IconButton
        type="button"
        title="Cancelar"
        aria-label="Cancelar"
        disabled={saving}
        onClick={onCancel}
      >
        <IconX size={16} stroke={1.75} />
      </IconButton>
    </form>
  );
}

export function SettingsCategoriesPage() {
  const { notify } = useNotify();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [quickAddParentId, setQuickAddParentId] = useState(null);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = typeFilter ? `?type=${encodeURIComponent(typeFilter)}` : '';
      setRows(await api(`${API.financeCategories}${params}`));
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [typeFilter]);

  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const parentOptions = useMemo(() => {
    return rows
      .filter(
        (r) =>
          r.type === form.type &&
          !r.parentId &&
          r.id !== editingId &&
          r.status === 'ativa',
      )
      .map((r) => ({ value: r.id, label: r.name }));
  }, [rows, form.type, editingId]);

  const displayRows = useMemo(() => {
    const roots = rows
      .filter((row) => !row.parentId)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.name.localeCompare(b.name);
      });

    const childrenByParent = new Map();
    for (const row of rows) {
      if (!row.parentId) continue;
      const list = childrenByParent.get(row.parentId) || [];
      list.push(row);
      childrenByParent.set(row.parentId, list);
    }
    for (const list of childrenByParent.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    const ordered = [];
    for (const root of roots) {
      ordered.push(root);
      for (const child of childrenByParent.get(root.id) || []) {
        ordered.push(child);
      }
      if (quickAddParentId === root.id) {
        ordered.push({
          id: `__quick_add__${root.id}`,
          __quickAdd: true,
          parentId: root.id,
          type: root.type,
          iconKey: root.iconKey,
          color: root.color,
          name: '',
          status: 'ativa',
        });
      }
    }

    // Filhos órfãos (pai filtrado/ausente) no fim
    const placed = new Set(ordered.map((row) => row.id));
    for (const row of rows) {
      if (!placed.has(row.id)) ordered.push(row);
    }
    return ordered;
  }, [rows, quickAddParentId]);

  function openCreate() {
    setDetail(null);
    setQuickAddParentId(null);
    setEditingId(null);
    setForm(blankForm());
    setModalOpen(true);
  }

  function openEdit(row) {
    if (row.__quickAdd) return;
    setDetail(null);
    setQuickAddParentId(null);
    setEditingId(row.id);
    setForm(rowToForm(row));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(blankForm());
  }

  function startQuickAdd(parent) {
    setDetail(null);
    setQuickAddParentId(parent.id);
    setQuickAddName('');
  }

  function cancelQuickAdd() {
    setQuickAddParentId(null);
    setQuickAddName('');
    setQuickSaving(false);
  }

  async function submitQuickAdd() {
    const parent = byId.get(quickAddParentId);
    const name = quickAddName.trim();
    if (!parent || !name) {
      notify('Informe o nome da subcategoria.', 'error');
      return;
    }
    setQuickSaving(true);
    try {
      await api(API.financeCategories, {
        method: 'POST',
        body: JSON.stringify({
          name,
          type: parent.type,
          parentId: parent.id,
          iconKey: parent.iconKey || 'tag',
          color: parent.color || '#0f9f90',
          status: 'ativa',
        }),
      });
      notify('Subcategoria criada.', 'success');
      cancelQuickAdd();
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setQuickSaving(false);
    }
  }

  async function onSave(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      notify('Informe o nome da categoria.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        parentId: form.parentId || null,
        iconKey: form.iconKey || 'tag',
        color: form.color || '#0f9f90',
        status: form.status,
      };
      if (editingId) {
        await api(API.financeCategory(editingId), {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        notify('Categoria atualizada.', 'success');
      } else {
        await api(API.financeCategories, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notify('Categoria criada.', 'success');
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
      <ListToolbar>
        <FilterChips
          label="Tipo"
          value={typeFilter}
          options={TYPE_FILTER}
          onChange={setTypeFilter}
        />
        <Button type="button" onClick={openCreate}>
          <IconPlus size={16} stroke={1.75} />
          Nova categoria
        </Button>
      </ListToolbar>
      <PageSection title="Categorias" delay={1} flush>
        <DataTable
          flush
          loading={loading}
          rows={displayRows}
          onRowClick={(row) => {
            if (row.__quickAdd) return;
            setDetail(row);
          }}
          emptyMessage="Nenhuma categoria cadastrada."
          columns={[
            {
              key: 'name',
              label: 'Categoria',
              primary: true,
              render: (row) => {
                if (row.__quickAdd) {
                  const parent = byId.get(row.parentId);
                  if (!parent) return null;
                  return (
                    <QuickAddRow
                      parent={parent}
                      value={quickAddName}
                      saving={quickSaving}
                      onChange={setQuickAddName}
                      onCancel={cancelQuickAdd}
                      onSubmit={() => void submitQuickAdd()}
                    />
                  );
                }
                return <CategoryNameCell row={row} onQuickAdd={startQuickAdd} />;
              },
            },
            {
              key: 'type',
              label: 'Tipo',
              narrow: true,
              render: (row) =>
                row.__quickAdd ? null : (
                  <Badge tone={row.type === 'receita' ? 'ok' : 'danger'}>
                    {row.type === 'receita' ? 'Receita' : 'Despesa'}
                  </Badge>
                ),
            },
            {
              key: 'status',
              label: 'Status',
              narrow: true,
              render: (row) =>
                row.__quickAdd ? null : (
                  <Badge tone={row.status === 'ativa' ? 'ok' : 'neutral'}>
                    {row.status === 'ativa' ? 'Ativa' : 'Inativa'}
                  </Badge>
                ),
            },
            {
              key: 'actions',
              label: 'Ações',
              actions: true,
              render: (row) => {
                if (row.__quickAdd) return null;
                return (
                  <IconButton
                    title="Editar"
                    aria-label="Editar"
                    onClick={() => openEdit(row)}
                  >
                    <IconPencil size={16} stroke={1.75} />
                  </IconButton>
                );
              },
            },
          ]}
        />
      </PageSection>

      <Modal
        open={Boolean(detail)}
        title={detail?.name || 'Categoria'}
        wide
        onClose={() => setDetail(null)}
        footer={
          detail ? (
            <>
              <Button variant="ghost" onClick={() => setDetail(null)}>
                Fechar
              </Button>
              {!detail.parentId ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDetail(null);
                    startQuickAdd(detail);
                  }}
                >
                  <IconPlus size={16} stroke={1.75} />
                  Subcategoria
                </Button>
              ) : null}
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
              <div className="category-detail-hero">
                <CategoryGlyph iconKey={detail.iconKey} color={detail.color} size={22} />
                <div>
                  <p className="category-detail-hero__name">{detail.name}</p>
                  <p className="category-detail-hero__meta">
                    {detail.type === 'receita' ? 'Receita' : 'Despesa'}
                    {detail.parentId
                      ? ` · filha de ${byId.get(detail.parentId)?.name || 'categoria'}`
                      : ''}
                  </p>
                </div>
              </div>
              <DetailGrid>
                <DetailItem
                  label="Status"
                  value={detail.status === 'ativa' ? 'Ativa' : 'Inativa'}
                />
                <DetailItem
                  label="Origem"
                  value={detail.isSystemSeed ? 'Padrão do sistema' : 'Personalizada'}
                />
                <DetailItem label="Cor" value={detail.color} />
                <DetailItem label="Ícone" value={detail.iconKey} />
              </DetailGrid>
            </DetailSection>
          </DetailView>
        ) : null}
      </Modal>

      <Modal
        open={modalOpen}
        title={editingId ? 'Editar categoria' : 'Nova categoria'}
        onClose={closeModal}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button form="category-form" type="submit" disabled={saving}>
              <BusyLabel active={saving} idle="Salvar" />
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={onSave} className="stack-tight">
          <div className="category-form-preview">
            <CategoryGlyph iconKey={form.iconKey} color={form.color} size={20} />
            <span className="category-form-preview__label">
              {form.name.trim() || 'Pré-visualização'}
            </span>
          </div>
          <TextField
            label="Nome"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <SelectField
            label="Tipo"
            value={form.type}
            onChange={(e) =>
              setForm((f) => ({ ...f, type: e.target.value, parentId: '' }))
            }
          >
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </SelectField>
          <SelectField
            label="Categoria pai"
            value={form.parentId}
            onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
            options={[{ value: '', label: 'Nenhuma (raiz)' }, ...parentOptions]}
          />
          <div className="form-grid-2 category-form-visuals">
            <IconSelect
              value={form.iconKey}
              onChange={(iconKey) => setForm((f) => ({ ...f, iconKey }))}
            />
            <ColorSwatchField
              value={form.color}
              onChange={(color) => setForm((f) => ({ ...f, color }))}
            />
          </div>
          <SelectField
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="ativa">Ativa</option>
            <option value="inativa">Inativa</option>
          </SelectField>
        </form>
      </Modal>
    </>
  );
}
