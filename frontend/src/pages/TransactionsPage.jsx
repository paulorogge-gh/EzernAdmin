import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconArrowsLeftRight,
  IconCircleDashed,
  IconCircleX,
  IconDownload,
  IconEye,
  IconFilterOff,
  IconLayoutGrid,
  IconPencil,
  IconPlus,
  IconRosetteDiscountCheck,
  IconThumbDown,
  IconThumbUp,
  IconX,
} from '@tabler/icons-react';
import { AttachmentPreviewModal } from '../components/parties/AttachmentPreviewModal';
import { Badge } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { DataTable } from '../components/ui/DataTable';
import { DateInput } from '../components/ui/DateInput';
import {
  DetailGrid,
  DetailItem,
  DetailList,
  DetailListItem,
  DetailListSkeleton,
  DetailSection,
  DetailView,
} from '../components/ui/DetailView';
import { FileDropzone } from '../components/ui/FileDropzone';
import { SelectField, TextField, TextareaField } from '../components/ui/Field';
import { FilterChips } from '../components/ui/ListToolbar';
import { ConfirmModal, Modal } from '../components/ui/Modal';
import { PageHeader, PageSection } from '../components/ui/Page';
import { BusyLabel } from '../components/ui/Processing';
import { SearchField } from '../components/ui/SearchField';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { SwitchField } from '../components/ui/SwitchField';
import { useNotify } from '../contexts/NotifyContext';
import { api, apiDownload, apiUpload, triggerBrowserDownload } from '../lib/api';
import { MAX_ATTACHMENT_LABEL } from '../lib/attachments';
import {
  MODALITY_OPTIONS,
  RECURRENCE_OPTIONS,
  TX_STATUS_OPTIONS,
  TX_STATUS_TONE,
  TX_TYPE_OPTIONS,
  dateBr,
  labelOf,
  moneyBr,
} from '../lib/financeLabels';
import { API } from '../lib/httpSurface';
import { displayPartyName } from '../lib/partyForm';

const TYPE_FILTER = [
  { value: '', label: 'Todos', icon: IconLayoutGrid },
  { value: 'despesa', label: 'Despesa', icon: IconArrowUpRight },
  { value: 'receita', label: 'Receita', icon: IconArrowDownLeft },
  { value: 'transferencia', label: 'Transferência', icon: IconArrowsLeftRight },
];

const STATUS_FILTER = [
  { value: '', label: 'Todos', icon: IconLayoutGrid },
  { value: 'pendente', label: 'Pendente', icon: IconCircleDashed },
  { value: 'pago', label: 'Pago', icon: IconRosetteDiscountCheck },
  { value: 'recebido', label: 'Recebido', icon: IconRosetteDiscountCheck },
  { value: 'cancelado', label: 'Cancelado', icon: IconCircleX },
];

const TYPE_CHOICES = [
  { value: 'despesa', label: 'Despesa', icon: IconArrowUpRight },
  { value: 'receita', label: 'Receita', icon: IconArrowDownLeft },
  { value: 'transferencia', label: 'Transferência', icon: IconArrowsLeftRight },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function blankForm() {
  return {
    type: 'despesa',
    description: '',
    amount: '',
    dueDate: todayIso(),
    modality: 'unico',
    recurrenceFrequency: 'mensal',
    installmentTotal: '2',
    accountId: '',
    transferAccountId: '',
    cardId: '',
    originKind: 'account',
    categoryId: '',
    partyId: '',
    costCenterId: '',
    notes: '',
    settleNow: false,
  };
}

function accountNameById(accounts, id) {
  return accounts.find((item) => item.id === id)?.name || '';
}

function buildTransferDescription(accounts, fromId, toId) {
  const from = accountNameById(accounts, fromId);
  const to = accountNameById(accounts, toId);
  if (from && to) return `Transferência entre ${from} e ${to}`;
  if (from) return `Transferência de ${from}`;
  if (to) return `Transferência para ${to}`;
  return 'Transferência entre contas';
}

const TX_TYPE_INITIAL = {
  despesa: 'D',
  receita: 'R',
  transferencia: 'T',
};

function originKey(accountId, cardId) {
  if (cardId) return `card:${cardId}`;
  if (accountId) return `account:${accountId}`;
  return '';
}

function parseOrigin(value) {
  if (!value) return { accountId: null, cardId: null };
  if (value.startsWith('card:')) return { accountId: null, cardId: value.slice(5) };
  if (value.startsWith('account:')) return { accountId: value.slice(8), cardId: null };
  return { accountId: null, cardId: null };
}

export function TransactionsPage() {
  const { notify } = useNotify();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [costCenterFilter, setCostCenterFilter] = useState('');

  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [parties, setParties] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [detailAttachments, setDetailAttachments] = useState([]);
  const [detailAttachmentsLoading, setDetailAttachmentsLoading] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [descriptionAuto, setDescriptionAuto] = useState(true);
  const [descriptionEditing, setDescriptionEditing] = useState(false);
  const descriptionInputRef = useRef(null);
  const loadSeq = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void Promise.all([
      api(API.financeAccounts),
      api(API.financeCards),
      api(API.financeCategories),
      api(API.financeCostCenters),
      api(API.parties),
    ])
      .then(([accs, cds, cats, ccs, pts]) => {
        setAccounts(accs);
        setCards(cds);
        setCategories(cats);
        setCostCenters(ccs);
        setParties(pts);
      })
      .catch((err) => notify(err.message, 'error'));
  }, []);

  async function load() {
    const requestId = ++loadSeq.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (accountFilter.startsWith('account:')) {
        params.set('accountId', accountFilter.slice(8));
      } else if (accountFilter.startsWith('card:')) {
        params.set('cardId', accountFilter.slice(5));
      }
      if (partyFilter) params.set('partyId', partyFilter);
      if (costCenterFilter) params.set('costCenterId', costCenterFilter);
      if (debouncedSearch) params.set('q', debouncedSearch);
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await api(`${API.financeTransactions}${query}`);
      if (requestId !== loadSeq.current) return;
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      if (requestId !== loadSeq.current) return;
      notify(err.message, 'error');
    } finally {
      if (requestId === loadSeq.current) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [
    typeFilter,
    statusFilter,
    fromDate,
    toDate,
    accountFilter,
    partyFilter,
    costCenterFilter,
    debouncedSearch,
  ]);

  const originOptions = useMemo(() => {
    const list = [];
    accounts
      .filter((a) => a.status === 'ativa')
      .forEach((a) => list.push({ value: `account:${a.id}`, label: `Conta: ${a.name}` }));
    cards
      .filter((c) => c.status === 'ativo')
      .forEach((c) =>
        list.push({
          value: `card:${c.id}`,
          label: `Cartão: ${c.name}${c.type === 'credito' ? ' (crédito)' : ' (débito)'}`,
        }),
      );
    return list;
  }, [accounts, cards]);

  const accountOnlyOptions = useMemo(
    () =>
      accounts
        .filter((a) => a.status === 'ativa')
        .map((a) => ({ value: a.id, label: a.name })),
    [accounts],
  );

  const categoryOptions = useMemo(() => {
    return categories
      .filter((c) => c.status === 'ativa' && c.type === form.type)
      .map((c) => ({
        value: c.id,
        label: c.parentId
          ? `${categories.find((p) => p.id === c.parentId)?.name || ''} › ${c.name}`
          : c.name,
      }));
  }, [categories, form.type]);

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

  const partyOptions = useMemo(() => {
    return parties
      .filter((p) => p.status === 'ACTIVE')
      .filter((p) => {
        if (form.type === 'despesa') return p.isSupplier;
        if (form.type === 'receita') return p.isCustomer;
        return true;
      })
      .map((p) => ({ value: p.id, label: displayPartyName(p) }));
  }, [parties, form.type]);

  const filterPartyOptions = useMemo(
    () =>
      parties
        .filter((p) => p.status === 'ACTIVE')
        .map((p) => ({ value: p.id, label: displayPartyName(p) })),
    [parties],
  );

  function resetAttachments() {
    setPendingFiles([]);
    setAttachments([]);
    setAttachmentsLoading(false);
    setUploadingFiles(false);
  }

  async function loadAttachments(txId) {
    if (!txId) {
      setAttachments([]);
      return;
    }
    setAttachmentsLoading(true);
    try {
      const data = await api(API.financeTransactionAttachments(txId));
      setAttachments(Array.isArray(data) ? data : []);
    } catch (err) {
      notify(err.message, 'error');
      setAttachments([]);
    } finally {
      setAttachmentsLoading(false);
    }
  }

  async function uploadPendingFiles(txId, files) {
    const list = Array.isArray(files) ? files : [];
    if (!txId || !list.length) return [];
    const body = new FormData();
    list.forEach((file) => body.append('files', file));
    setUploadingFiles(true);
    try {
      const created = await apiUpload(API.financeTransactionAttachments(txId), body);
      return Array.isArray(created) ? created : [];
    } finally {
      setUploadingFiles(false);
    }
  }

  function openCreate() {
    setDetail(null);
    setPreviewAttachment(null);
    setEditingId(null);
    setForm(blankForm());
    setDescriptionAuto(true);
    setDescriptionEditing(false);
    resetAttachments();
    setModalOpen(true);
  }

  function openEdit(row) {
    setDetail(null);
    setPreviewAttachment(null);
    setEditingId(row.id);
    setForm({
      type: row.type,
      description: row.description || '',
      amount: String(row.amount ?? ''),
      dueDate: row.dueDate || todayIso(),
      modality: 'unico',
      recurrenceFrequency: 'mensal',
      installmentTotal: '2',
      accountId: row.accountId || '',
      transferAccountId: row.transferAccountId || '',
      cardId: row.cardId || '',
      originKind: row.cardId ? 'card' : 'account',
      categoryId: row.categoryId || '',
      partyId: row.partyId || '',
      costCenterId: row.costCenterId || '',
      notes: row.notes || '',
      settleNow: false,
    });
    setDescriptionAuto(false);
    setDescriptionEditing(false);
    setPendingFiles([]);
    setModalOpen(true);
    void loadAttachments(row.id);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(blankForm());
    setDescriptionAuto(true);
    setDescriptionEditing(false);
    resetAttachments();
  }

  useEffect(() => {
    if (!modalOpen || form.type !== 'transferencia' || !descriptionAuto) return;
    const next = buildTransferDescription(accounts, form.accountId, form.transferAccountId);
    setForm((f) => (f.description === next ? f : { ...f, description: next }));
  }, [
    modalOpen,
    form.type,
    form.accountId,
    form.transferAccountId,
    descriptionAuto,
    accounts,
  ]);

  useEffect(() => {
    if (!descriptionEditing) return undefined;
    const timer = window.setTimeout(() => descriptionInputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [descriptionEditing]);

  async function openDetail(row) {
    setPreviewAttachment(null);
    setDetailAttachments([]);
    setDetailAttachmentsLoading(true);
    try {
      const data = await api(API.financeTransaction(row.id));
      setDetail(data);
      const files = await api(API.financeTransactionAttachments(row.id));
      setDetailAttachments(Array.isArray(files) ? files : []);
    } catch (err) {
      notify(err.message, 'error');
      setDetail(null);
    } finally {
      setDetailAttachmentsLoading(false);
    }
  }

  function onAddFiles(fileList) {
    setPendingFiles((current) => {
      const next = [...current];
      for (const file of fileList) {
        const duplicate = next.some(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified,
        );
        if (!duplicate) next.push(file);
      }
      return next;
    });
  }

  function onRejectFiles(rejected) {
    const list = Array.isArray(rejected) ? rejected : [];
    if (!list.length) return;
    if (list.length === 1) {
      notify(list[0].reason || `Arquivo acima do limite de ${MAX_ATTACHMENT_LABEL}.`, 'error');
      return;
    }
    notify(
      `${list.length} arquivos não puderam ser adicionados por excederem ${MAX_ATTACHMENT_LABEL}.`,
      'error',
    );
  }

  function onRemovePending(index) {
    setPendingFiles((current) => current.filter((_, i) => i !== index));
  }

  async function onRemoveExisting(item) {
    if (!editingId || !item?.id) return;
    try {
      await api(API.financeTransactionAttachment(editingId, item.id), { method: 'DELETE' });
      setAttachments((current) => current.filter((row) => row.id !== item.id));
      notify('Anexo removido.', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function onDownloadExisting(item, txId = editingId || detail?.id) {
    if (!txId || !item?.id) return;
    try {
      const result = await apiDownload(API.financeTransactionAttachmentDownload(txId, item.id));
      triggerBrowserDownload(result.blob, result.filename || item.originalName);
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function onSave(event) {
    event.preventDefault();
    if (!form.description.trim()) {
      notify('Informe a descrição.', 'error');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      notify('Informe um valor válido.', 'error');
      return;
    }

    setSaving(true);
    try {
      let savedId = editingId;
      if (editingId) {
        const payload = {
          description: form.description.trim(),
          amount: Number(form.amount),
          dueDate: form.dueDate,
          notes: form.notes || null,
        };
        if (form.type !== 'transferencia') {
          payload.categoryId = form.categoryId || null;
          payload.partyId = form.partyId || null;
          payload.costCenterId = form.costCenterId || null;
        }
        await api(API.financeTransaction(editingId), {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        notify('Lançamento atualizado.', 'success');
      } else if (form.type === 'transferencia') {
        const created = await api(API.financeTransactions, {
          method: 'POST',
          body: JSON.stringify({
            type: 'transferencia',
            description: form.description.trim(),
            amount: Number(form.amount),
            dueDate: form.dueDate,
            accountId: form.accountId,
            transferAccountId: form.transferAccountId,
            notes: form.notes || null,
          }),
        });
        savedId = created?.id;
        notify('Transferência registrada.', 'success');
      } else {
        const selectedOrigin = parseOrigin(
          form.cardId
            ? `card:${form.cardId}`
            : form.accountId
              ? `account:${form.accountId}`
              : '',
        );
        const payload = {
          type: form.type,
          description: form.description.trim(),
          amount: Number(form.amount),
          dueDate: form.dueDate,
          modality: form.modality,
          recurrenceFrequency: form.recurrenceFrequency,
          installmentTotal: Number(form.installmentTotal) || 2,
          accountId: selectedOrigin.accountId,
          cardId: selectedOrigin.cardId,
          categoryId: form.categoryId,
          partyId: form.partyId || null,
          costCenterId: form.costCenterId,
          notes: form.notes || null,
          settleNow: form.settleNow,
        };
        const created = await api(API.financeTransactions, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        savedId = created?.id;
        notify('Lançamento criado.', 'success');
      }

      if (savedId && pendingFiles.length) {
        try {
          await uploadPendingFiles(savedId, pendingFiles);
        } catch (uploadErr) {
          notify(
            uploadErr.message || 'Lançamento salvo, mas falhou o envio dos anexos.',
            'warning',
          );
        }
      }

      closeModal();
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function settle(row) {
    setActingId(row.id);
    try {
      await api(API.financeTransactionSettle(row.id), {
        method: 'POST',
        body: JSON.stringify({}),
      });
      notify(row.type === 'receita' ? 'Recebido.' : 'Pago.', 'success');
      if (detail?.id === row.id) {
        setDetail(await api(API.financeTransaction(row.id)));
      }
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setActingId(null);
    }
  }

  async function unsettle(row) {
    setActingId(row.id);
    try {
      await api(API.financeTransactionUnsettle(row.id), { method: 'POST' });
      notify('Liquidação desfeita.', 'success');
      if (detail?.id === row.id) {
        setDetail(await api(API.financeTransaction(row.id)));
      }
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setActingId(null);
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api(API.financeTransactionCancel(cancelTarget.id), {
        method: 'POST',
        body: JSON.stringify({ scope: 'this' }),
      });
      setCancelTarget(null);
      setDetail(null);
      notify('Lançamento cancelado.', 'success');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setCancelling(false);
    }
  }

  function canSettle(row) {
    if (!row) return false;
    if (row.type === 'transferencia') return false;
    if (row.status === 'cancelado') return false;
    if (row.invoiceId) return false;
    if (row.card?.type === 'credito') return false;
    return row.status === 'pendente' || row.effectiveStatus === 'atrasado';
  }

  function canUnsettle(row) {
    if (!row) return false;
    if (row.type === 'transferencia') return false;
    if (row.invoiceId) return false;
    return row.status === 'pago' || row.status === 'recebido';
  }

  const currentOrigin = originKey(form.accountId, form.cardId);
  const selectedCard = cards.find((c) => c.id === form.cardId);
  const showSettleToggle =
    !editingId &&
    form.type !== 'transferencia' &&
    form.modality === 'unico' &&
    (!form.cardId || selectedCard?.type === 'debito');

  const hasActiveFilters = Boolean(
    search ||
      typeFilter ||
      statusFilter ||
      fromDate ||
      toDate ||
      accountFilter ||
      partyFilter ||
      costCenterFilter,
  );

  function clearFilters() {
    setSearch('');
    setTypeFilter('');
    setStatusFilter('');
    setFromDate('');
    setToDate('');
    setAccountFilter('');
    setPartyFilter('');
    setCostCenterFilter('');
  }

  return (
    <div>
      <PageHeader
        title="Lançamentos"
        description="Despesas, receitas e transferências da empresa."
        actions={
          <Button type="button" onClick={openCreate}>
            <IconPlus size={16} stroke={1.75} />
            Novo lançamento
          </Button>
        }
      />

      <section className="tx-filter-panel anim-fade-up" aria-label="Filtros de lançamentos">
        <div className="tx-filter-panel__fields">
          <DateInput
            label="De"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <DateInput
            label="Até"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          <SelectField
            label="Conta ou cartão"
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            options={[{ value: '', label: 'Todos' }, ...originOptions]}
          />
          <SelectField
            label="Parceiro"
            value={partyFilter}
            onChange={(e) => setPartyFilter(e.target.value)}
            options={[{ value: '', label: 'Todos' }, ...filterPartyOptions]}
          />
          <SelectField
            label="Centro de custo"
            value={costCenterFilter}
            onChange={(e) => setCostCenterFilter(e.target.value)}
            options={[{ value: '', label: 'Todos' }, ...costCenterOptions]}
          />
        </div>

        <div className="tx-filter-panel__search">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Buscar por descrição"
            label="Buscar lançamentos"
          />
          {hasActiveFilters ? (
            <button
              type="button"
              className="tx-filter-panel__clear"
              onClick={clearFilters}
            >
              <IconFilterOff size={15} stroke={1.6} />
              Limpar
            </button>
          ) : null}
        </div>
      </section>

      <section
        className="tx-filter-panel anim-fade-up"
        aria-label="Filtros por tipo e status"
      >
        <div className="tx-filter-panel__toggles">
          <div className="tx-filter-group">
            <span className="tx-filter-group__label">Tipo</span>
            <FilterChips
              label="Tipo"
              variant="soft"
              className="tx-type-chips"
              value={typeFilter}
              options={TYPE_FILTER}
              onChange={setTypeFilter}
            />
          </div>
          <div className="tx-filter-group">
            <span className="tx-filter-group__label">Status</span>
            <FilterChips
              label="Status"
              variant="soft"
              value={statusFilter}
              options={STATUS_FILTER}
              onChange={setStatusFilter}
            />
          </div>
        </div>
      </section>

      <PageSection title="Movimentações" delay={1} flush>
        <DataTable
          flush
          loading={loading}
          rows={rows}
          onRowClick={(row) => void openDetail(row)}
          emptyMessage="Nenhum lançamento encontrado."
          columns={[
            {
              key: 'description',
              label: 'Descrição',
              render: (row) => (
                <div className="tx-desc-cell">
                  <span
                    className={`tx-type-sticker tx-type-sticker--${row.type}`}
                    title={labelOf(TX_TYPE_OPTIONS, row.type)}
                    aria-label={labelOf(TX_TYPE_OPTIONS, row.type)}
                  >
                    {TX_TYPE_INITIAL[row.type] || '?'}
                  </span>
                  <div className="tx-desc-cell__body">
                    <span className="data-table__primary">{row.description}</span>
                    {row.party ? (
                      <span className="data-table__secondary">
                        {displayPartyName(row.party)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ),
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
              render: (row) => (
                <span
                  className={
                    row.type === 'receita'
                      ? 'text-success'
                      : row.type === 'despesa'
                        ? 'text-danger'
                        : row.type === 'transferencia'
                          ? 'text-info'
                          : ''
                  }
                >
                  {moneyBr(row.amount)}
                </span>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              narrow: true,
              render: (row) => (
                <Badge tone={TX_STATUS_TONE[row.effectiveStatus] || 'neutral'}>
                  {labelOf(
                    [
                      ...TX_STATUS_OPTIONS,
                      { value: 'transferido', label: 'Transferido' },
                    ],
                    row.effectiveStatus,
                  )}
                </Badge>
              ),
            },
            {
              key: 'actions',
              label: 'Ações',
              actions: true,
              render: (row) => (
                <>
                  {canSettle(row) ? (
                    <IconButton
                      className="tx-settle-btn tx-settle-btn--pending"
                      title="Liquidar"
                      aria-label="Liquidar"
                      disabled={actingId === row.id}
                      onClick={() => void settle(row)}
                    >
                      <IconThumbDown size={16} stroke={1.75} />
                    </IconButton>
                  ) : null}
                  {canUnsettle(row) ? (
                    <IconButton
                      className="tx-settle-btn tx-settle-btn--done"
                      title="Desfazer liquidação"
                      aria-label="Desfazer liquidação"
                      disabled={actingId === row.id}
                      onClick={() => void unsettle(row)}
                    >
                      <IconThumbUp size={16} stroke={1.75} />
                    </IconButton>
                  ) : null}
                  {row.status !== 'cancelado' && row.type !== 'transferencia' ? (
                    <IconButton
                      title="Editar"
                      aria-label="Editar"
                      onClick={() => openEdit(row)}
                    >
                      <IconPencil size={16} stroke={1.75} />
                    </IconButton>
                  ) : null}
                  {row.status !== 'cancelado' ? (
                    <IconButton
                      danger
                      title="Cancelar"
                      aria-label="Cancelar"
                      onClick={() => setCancelTarget(row)}
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
        open={Boolean(detail)}
        title={detail?.description || 'Lançamento'}
        wide
        tone={detail?.type || ''}
        onClose={() => {
          setPreviewAttachment(null);
          setDetail(null);
        }}
        footer={
          detail ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setPreviewAttachment(null);
                  setDetail(null);
                }}
              >
                Fechar
              </Button>
              {canSettle(detail) ? (
                <Button
                  variant="ghost"
                  disabled={actingId === detail.id}
                  onClick={() => void settle(detail)}
                >
                  Liquidar
                </Button>
              ) : null}
              {canUnsettle(detail) ? (
                <Button
                  variant="ghost"
                  disabled={actingId === detail.id}
                  onClick={() => void unsettle(detail)}
                >
                  Desfazer liquidação
                </Button>
              ) : null}
              {detail.status !== 'cancelado' && detail.type !== 'transferencia' ? (
                <Button type="button" onClick={() => openEdit(detail)}>
                  <IconPencil size={16} stroke={1.75} />
                  Editar
                </Button>
              ) : null}
            </>
          ) : null
        }
      >
        {detail ? (
          <DetailView>
            <DetailSection title="Lançamento">
              <DetailGrid>
                <DetailItem
                  label="Tipo"
                  value={
                    <span className={`tx-type-label tx-type-label--${detail.type}`}>
                      {labelOf(TX_TYPE_OPTIONS, detail.type)}
                    </span>
                  }
                />
                <DetailItem label="Descrição" value={detail.description} />
                <DetailItem
                  label="Valor"
                  value={
                    <span
                      className={
                        detail.type === 'receita'
                          ? 'text-success'
                          : detail.type === 'despesa'
                            ? 'text-danger'
                            : detail.type === 'transferencia'
                              ? 'text-info'
                              : undefined
                      }
                    >
                      {moneyBr(detail.amount)}
                    </span>
                  }
                />
                <DetailItem
                  label="Status"
                  value={labelOf(
                    [...TX_STATUS_OPTIONS, { value: 'transferido', label: 'Transferido' }],
                    detail.effectiveStatus,
                  )}
                />
                <DetailItem label="Vencimento" value={dateBr(detail.dueDate)} />
                <DetailItem label="Liquidação" value={dateBr(detail.paidAt)} />
                <DetailItem
                  label="Modalidade"
                  value={labelOf(MODALITY_OPTIONS, detail.modality)}
                />
                <DetailItem
                  label="Origem"
                  value={detail.account?.name || detail.card?.name}
                />
                {detail.transferAccount ? (
                  <DetailItem label="Destino" value={detail.transferAccount.name} />
                ) : null}
                <DetailItem label="Categoria" value={detail.category?.name} />
                {detail.type !== 'transferencia' ? (
                  <DetailItem
                    label={detail.type === 'receita' ? 'Cliente' : 'Fornecedor'}
                    value={
                      detail.party
                        ? displayPartyName(detail.party)
                        : 'Sem identificação'
                    }
                  />
                ) : null}
                <DetailItem label="Centro de custo" value={detail.costCenter?.name} />
                <DetailItem label="Observações" value={detail.notes} full />
              </DetailGrid>
            </DetailSection>
            <DetailSection title="Anexos">
              {detailAttachmentsLoading ? (
                <DetailListSkeleton active rows={2} />
              ) : detailAttachments.length ? (
                <DetailList>
                  {detailAttachments.map((file) => (
                    <DetailListItem
                      key={file.id}
                      title={file.originalName || 'Arquivo'}
                      meta={file.contentType || ''}
                      badge={
                        <div className="detail-list__actions">
                          <IconButton
                            type="button"
                            title="Ver"
                            aria-label="Ver anexo"
                            onClick={() => setPreviewAttachment(file)}
                          >
                            <IconEye size={16} stroke={1.75} />
                          </IconButton>
                          <IconButton
                            type="button"
                            title="Baixar"
                            aria-label="Baixar anexo"
                            onClick={() => void onDownloadExisting(file, detail.id)}
                          >
                            <IconDownload size={16} stroke={1.75} />
                          </IconButton>
                        </div>
                      }
                    />
                  ))}
                </DetailList>
              ) : (
                <DetailGrid columns={1}>
                  <DetailItem label="Arquivos" value="" empty="Nenhum anexo" />
                </DetailGrid>
              )}
            </DetailSection>
          </DetailView>
        ) : null}
      </Modal>

      <AttachmentPreviewModal
        open={Boolean(detail && previewAttachment)}
        downloadUrl={
          detail && previewAttachment
            ? API.financeTransactionAttachmentDownload(detail.id, previewAttachment.id)
            : ''
        }
        file={previewAttachment}
        onBack={() => setPreviewAttachment(null)}
        onDownload={(file) => void onDownloadExisting(file, detail?.id)}
      />

      <Modal
        open={modalOpen}
        title={editingId ? 'Editar lançamento' : 'Novo lançamento'}
        wide
        tone={form.type}
        onClose={closeModal}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={closeModal}
              disabled={saving || uploadingFiles}
            >
              Cancelar
            </Button>
            <Button
              form="tx-form"
              type="submit"
              disabled={saving || uploadingFiles || attachmentsLoading}
            >
              <BusyLabel active={saving || uploadingFiles} idle="Salvar" />
            </Button>
          </>
        }
      >
        <form id="tx-form" onSubmit={onSave} className="stack-tight tx-form">
          {!editingId ? (
            <SegmentedControl
              label="Tipo"
              className="tx-type-segmented"
              value={form.type}
              options={TYPE_CHOICES}
              onChange={(type) => {
                const nextDescription =
                  type === 'transferencia'
                    ? buildTransferDescription(accounts, form.accountId, form.transferAccountId)
                    : descriptionAuto
                      ? ''
                      : form.description;
                setDescriptionAuto(type === 'transferencia' ? true : descriptionAuto);
                setDescriptionEditing(false);
                setForm((f) => ({
                  ...f,
                  type,
                  description: nextDescription,
                  categoryId: '',
                  partyId: '',
                  costCenterId: type === 'transferencia' ? '' : f.costCenterId,
                  cardId: type === 'transferencia' ? '' : f.cardId,
                  transferAccountId: type === 'transferencia' ? f.transferAccountId : '',
                  modality: type === 'transferencia' ? 'unico' : f.modality,
                  settleNow: false,
                }));
              }}
            />
          ) : null}

          {form.type === 'transferencia' ? (
            <div className="form-grid-2">
              <SelectField
                label="Conta origem"
                required
                value={form.accountId}
                onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                options={[{ value: '', label: 'Selecione' }, ...accountOnlyOptions]}
              />
              <SelectField
                label="Conta destino"
                required
                value={form.transferAccountId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, transferAccountId: e.target.value }))
                }
                options={[
                  { value: '', label: 'Selecione' },
                  ...accountOnlyOptions.filter((o) => o.value !== form.accountId),
                ]}
              />
            </div>
          ) : null}

          {form.type === 'transferencia' ? (
            <div className="field tx-description-field">
              <span className="field__label">Descrição</span>
              {descriptionAuto && !descriptionEditing ? (
                <button
                  type="button"
                  className="tx-description-auto"
                  onClick={() => setDescriptionEditing(true)}
                >
                  <span className="tx-description-auto__text">
                    {form.description || 'Transferência entre contas'}
                  </span>
                  <span className="tx-description-auto__hint">Clique para editar</span>
                </button>
              ) : (
                <input
                  ref={descriptionInputRef}
                  id="tx-transfer-description"
                  type="text"
                  className="field__control"
                  required
                  value={form.description}
                  onChange={(e) => {
                    setDescriptionAuto(false);
                    setForm((f) => ({ ...f, description: e.target.value }));
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    const auto = buildTransferDescription(
                      accounts,
                      form.accountId,
                      form.transferAccountId,
                    );
                    if (!value || value === auto) {
                      setForm((f) => ({ ...f, description: auto }));
                      setDescriptionAuto(true);
                    }
                    setDescriptionEditing(false);
                  }}
                />
              )}
            </div>
          ) : (
            <TextField
              label="Descrição"
              required
              value={form.description}
              onChange={(e) => {
                setDescriptionAuto(false);
                setForm((f) => ({ ...f, description: e.target.value }));
              }}
            />
          )}

          <div className="form-grid-2">
            <CurrencyInput
              label="Valor"
              required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <DateInput
              label="Data"
              required
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
          </div>

          {form.type === 'transferencia' ? null : (
            <>
              {!editingId ? (
                <div className="form-grid-2">
                  <SelectField
                    label="Modalidade"
                    value={form.modality}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, modality: e.target.value, settleNow: false }))
                    }
                    options={MODALITY_OPTIONS}
                  />
                  {form.modality === 'recorrente' ? (
                    <SelectField
                      label="Frequência"
                      value={form.recurrenceFrequency}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, recurrenceFrequency: e.target.value }))
                      }
                      options={RECURRENCE_OPTIONS}
                    />
                  ) : null}
                  {form.modality === 'parcelado' ? (
                    <TextField
                      label="Parcelas"
                      type="number"
                      min={2}
                      max={60}
                      value={form.installmentTotal}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, installmentTotal: e.target.value }))
                      }
                    />
                  ) : null}
                  {form.modality === 'unico' ? (
                    <SelectField
                      label="Conta ou cartão"
                      required
                      value={currentOrigin}
                      onChange={(e) => {
                        const next = parseOrigin(e.target.value);
                        setForm((f) => ({
                          ...f,
                          accountId: next.accountId || '',
                          cardId: next.cardId || '',
                          settleNow: false,
                        }));
                      }}
                      options={[{ value: '', label: 'Selecione' }, ...originOptions]}
                    />
                  ) : null}
                </div>
              ) : null}

              {!editingId && form.modality !== 'unico' ? (
                <SelectField
                  label="Conta ou cartão"
                  required
                  value={currentOrigin}
                  onChange={(e) => {
                    const next = parseOrigin(e.target.value);
                    setForm((f) => ({
                      ...f,
                      accountId: next.accountId || '',
                      cardId: next.cardId || '',
                      settleNow: false,
                    }));
                  }}
                  options={[{ value: '', label: 'Selecione' }, ...originOptions]}
                />
              ) : null}

              <div className="form-grid-2">
                <SelectField
                  label="Categoria"
                  required
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  options={[{ value: '', label: 'Selecione' }, ...categoryOptions]}
                />
                <SelectField
                  label={form.type === 'receita' ? 'Cliente' : 'Fornecedor'}
                  value={form.partyId}
                  onChange={(e) => setForm((f) => ({ ...f, partyId: e.target.value }))}
                  options={[
                    { value: '', label: 'Sem identificação' },
                    ...partyOptions,
                  ]}
                />
              </div>

              <div className="form-grid-2">
                <SelectField
                  label="Centro de custo"
                  required
                  value={form.costCenterId}
                  onChange={(e) => setForm((f) => ({ ...f, costCenterId: e.target.value }))}
                  options={[{ value: '', label: 'Selecione' }, ...costCenterOptions]}
                />
                {showSettleToggle ? (
                  <div className="tx-form__settle">
                    <SwitchField
                      label={form.type === 'receita' ? 'Já recebido' : 'Já pago'}
                      checked={form.settleNow}
                      onChange={(checked) => setForm((f) => ({ ...f, settleNow: checked }))}
                    />
                  </div>
                ) : null}
              </div>

              {form.cardId && selectedCard?.type === 'credito' ? (
                <p className="field__hint tx-form__hint">
                  Compra no crédito entra na fatura do cartão. Liquidação só pelo pagamento
                  da fatura.
                </p>
              ) : null}
            </>
          )}

          <TextareaField
            label="Observações"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
          />

          <FileDropzone
            label="Anexos"
            files={pendingFiles}
            existing={attachments}
            busy={uploadingFiles || attachmentsLoading}
            disabled={saving}
            onAddFiles={onAddFiles}
            onRejectFiles={onRejectFiles}
            onRemovePending={onRemovePending}
            onRemoveExisting={editingId ? onRemoveExisting : undefined}
            onDownloadExisting={editingId ? onDownloadExisting : undefined}
          />
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(cancelTarget)}
        title="Cancelar lançamento"
        confirmLabel="Cancelar lançamento"
        loading={cancelling}
        danger
        onClose={() => setCancelTarget(null)}
        onConfirm={() => void confirmCancel()}
      >
        Confirma o cancelamento de &quot;{cancelTarget?.description}&quot;?
      </ConfirmModal>
    </div>
  );
}
