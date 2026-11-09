import { useEffect, useRef, useState } from 'react';
import {
  IconArrowsExchange,
  IconBuilding,
  IconPencil,
  IconPlus,
  IconTrash,
  IconTruck,
  IconUser,
} from '@tabler/icons-react';
import { AddressField } from '../components/ui/AddressField';
import { Badge } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { ChoiceCards } from '../components/ui/ChoiceCards';
import { DataTable } from '../components/ui/DataTable';
import { DateInput } from '../components/ui/DateInput';
import { FileDropzone } from '../components/ui/FileDropzone';
import { SelectField, TextField, TextareaField } from '../components/ui/Field';
import { FilterChips, ListToolbar } from '../components/ui/ListToolbar';
import { FormReveal } from '../components/ui/FormReveal';
import { MaskedField } from '../components/ui/MaskedField';
import { ConfirmModal, Modal } from '../components/ui/Modal';
import { PageHeader, PageSection } from '../components/ui/Page';
import { BusyLabel } from '../components/ui/Processing';
import { SearchField } from '../components/ui/SearchField';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { SwitchField } from '../components/ui/SwitchField';
import { AttachmentPreviewModal } from '../components/parties/AttachmentPreviewModal';
import { PartyDetailView } from '../components/parties/PartyDetailView';
import { useNotify } from '../contexts/NotifyContext';
import { emptyAddress } from '../lib/address';
import { MAX_ATTACHMENT_LABEL } from '../lib/attachments';
import { api, apiDownload, apiUpload, triggerBrowserDownload } from '../lib/api';
import { BRAZILIAN_BANK_OPTIONS } from '../lib/brazilianBanks';
import { API } from '../lib/httpSurface';
import {
  formatCnpj,
  formatCpfCnpj,
  formatDocument,
  formatUppercase,
  formatWhatsappUsername,
  onlyDigits,
  personTypeFromDocument,
} from '../lib/masks';
import {
  ACCOUNT_HOLDER_KIND,
  ACCOUNT_HOLDER_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
  blankBillingContact,
} from '../lib/partyFinance';
import {
  PARTY_KIND_LABEL,
  PARTY_KIND_OPTIONS,
  PERSON_TYPE_LABEL,
  blankPartyForm,
  displayPartyName,
  partyPayloadFromForm,
  partyToForm,
  validatePartyForm,
} from '../lib/partyForm';
import { STATUS_LABEL, STATUS_TONE } from '../lib/userForm';

const KIND_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  ...PARTY_KIND_OPTIONS,
];

const KIND_CHOICE_OPTIONS = [
  { value: 'CUSTOMER', label: 'Cliente', icon: IconUser },
  { value: 'SUPPLIER', label: 'Fornecedor', icon: IconTruck },
  { value: 'BOTH', label: 'Ambos', icon: IconArrowsExchange },
];

const PERSON_TYPE_OPTIONS = [
  { value: 'PF', label: 'Pessoa física', icon: IconUser },
  { value: 'PJ', label: 'Pessoa jurídica', icon: IconBuilding },
];

export function PartiesPage() {
  const { notify } = useNotify();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterKind, setFilterKind] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankPartyForm);
  const [fieldError, setFieldError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [saving, setSaving] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);
  const [detailParty, setDetailParty] = useState(null);
  const [detailAttachments, setDetailAttachments] = useState([]);
  const [detailAttachmentsLoading, setDetailAttachmentsLoading] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const lastCnpjLookup = useRef('');
  const cnpjAutofilled = useRef(false);
  const loadSeq = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  async function load({ kind = filterKind, q = debouncedSearch } = {}) {
    const requestId = ++loadSeq.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (kind) params.set('kind', kind);
      if (q) params.set('q', q);
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await api(`${API.parties}${query}`);
      if (requestId !== loadSeq.current) return;
      setRows(data);
    } catch (err) {
      if (requestId !== loadSeq.current) return;
      notify(err.message, 'error');
    } finally {
      if (requestId === loadSeq.current) setLoading(false);
    }
  }

  useEffect(() => {
    void load({ kind: filterKind, q: debouncedSearch });
  }, [filterKind, debouncedSearch]);

  function resetAttachments() {
    setPendingFiles([]);
    setAttachments([]);
    setAttachmentsLoading(false);
    setUploadingFiles(false);
  }

  async function loadAttachments(partyId) {
    if (!partyId) {
      setAttachments([]);
      return;
    }
    setAttachmentsLoading(true);
    try {
      const data = await api(API.partyAttachments(partyId));
      setAttachments(Array.isArray(data) ? data : []);
    } catch (err) {
      notify(err.message, 'error');
      setAttachments([]);
    } finally {
      setAttachmentsLoading(false);
    }
  }

  async function uploadPendingFiles(partyId, files) {
    const list = Array.isArray(files) ? files : [];
    if (!partyId || !list.length) return [];
    const body = new FormData();
    list.forEach((file) => body.append('files', file));
    setUploadingFiles(true);
    try {
      const created = await apiUpload(API.partyAttachments(partyId), body);
      return Array.isArray(created) ? created : [];
    } finally {
      setUploadingFiles(false);
    }
  }

  function openCreate() {
    setDetailParty(null);
    setEditingId(null);
    setForm(blankPartyForm());
    setFieldError('');
    setAddressError('');
    resetAttachments();
    lastCnpjLookup.current = '';
    cnpjAutofilled.current = false;
    setModalOpen(true);
  }

  async function openDetail(party) {
    setDetailParty(party);
    setDetailAttachments([]);
    if (!party?.id) return;
    setDetailAttachmentsLoading(true);
    try {
      const data = await api(API.partyAttachments(party.id));
      setDetailAttachments(Array.isArray(data) ? data : []);
    } catch (err) {
      notify(err.message, 'error');
      setDetailAttachments([]);
    } finally {
      setDetailAttachmentsLoading(false);
    }
  }

  function closeDetail() {
    setPreviewAttachment(null);
    setDetailParty(null);
    setDetailAttachments([]);
    setDetailAttachmentsLoading(false);
  }

  function openEdit(party) {
    closeDetail();
    setEditingId(party.id);
    setForm(partyToForm(party));
    setFieldError('');
    setAddressError('');
    setPendingFiles([]);
    lastCnpjLookup.current = onlyDigits(party.document || '');
    cnpjAutofilled.current = false;
    setModalOpen(true);
    void loadAttachments(party.id);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(blankPartyForm());
    setFieldError('');
    setAddressError('');
    setCnpjLoading(false);
    lastCnpjLookup.current = '';
    cnpjAutofilled.current = false;
    resetAttachments();
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
      await api(API.partyAttachment(editingId, item.id), { method: 'DELETE' });
      setAttachments((current) => current.filter((row) => row.id !== item.id));
      notify('Anexo removido.', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function onDownloadExisting(item, partyId = editingId) {
    if (!partyId || !item?.id) return;
    try {
      const result = await apiDownload(API.partyAttachmentDownload(partyId, item.id));
      triggerBrowserDownload(result.blob, result.filename || item.originalName);
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function lookupCnpjIfNeeded(documentValue) {
    const digits = onlyDigits(documentValue);
    if (digits.length !== 14) return;
    if (lastCnpjLookup.current === digits) return;
    lastCnpjLookup.current = digits;
    setCnpjLoading(true);
    try {
      const data = await api(API.cnpjLookup(digits));
      // Se o usuário apagou o CNPJ enquanto a consulta rodava, não reaplicar.
      if (onlyDigits(lastCnpjLookup.current) !== digits) return;
      cnpjAutofilled.current = true;
      setForm((f) => ({
        ...f,
        personType: 'PJ',
        legalName: formatUppercase(data.legalName || ''),
        tradeName: formatUppercase(data.tradeName || ''),
        contactName: data.contactName || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || emptyAddress(),
      }));
      setAddressError('');
      notify('Dados do CNPJ preenchidos.', 'success');
    } catch (err) {
      cnpjAutofilled.current = false;
      notify(err.message || 'Não foi possível consultar o CNPJ', 'warning');
    } finally {
      setCnpjLoading(false);
    }
  }

  function onPersonTypeChange(nextType) {
    const personType = nextType === 'PJ' ? 'PJ' : nextType === 'PF' ? 'PF' : '';
    if (!personType) return;
    const digits = onlyDigits(form.document);
    const document = formatDocument(personType, digits);
    const leavingAutofill =
      form.personType === 'PJ' && personType === 'PF' && cnpjAutofilled.current;

    setFieldError('');
    if (leavingAutofill) {
      lastCnpjLookup.current = '';
      cnpjAutofilled.current = false;
      setAddressError('');
      setForm((f) => ({
        ...f,
        personType,
        document,
        legalName: '',
        tradeName: '',
        contactName: '',
        birthDate: '',
        email: '',
        phone: '',
        address: emptyAddress(),
      }));
      return;
    }

    setForm((f) => ({
      ...f,
      personType,
      document,
      ...(personType === 'PF' ? { tradeName: '' } : { birthDate: '' }),
    }));

    if (personType === 'PJ' && digits.length === 14) {
      void lookupCnpjIfNeeded(formatCnpj(digits));
    } else if (personType === 'PF') {
      lastCnpjLookup.current = '';
    }
  }

  function onDocumentChange(event) {
    const masked = event.target.value;
    const digits = onlyDigits(masked);
    const personType = personTypeFromDocument(digits);
    setFieldError('');

    if (cnpjAutofilled.current && digits.length < 14) {
      lastCnpjLookup.current = '';
      cnpjAutofilled.current = false;
      setAddressError('');
      setForm((f) => ({
        ...f,
        document: masked,
        personType,
        legalName: '',
        tradeName: '',
        contactName: '',
        birthDate: '',
        email: '',
        phone: '',
        address: emptyAddress(),
      }));
      return;
    }

    setForm((f) => ({
      ...f,
      document: masked,
      personType,
      ...(personType === 'PF' ? { tradeName: '' } : { birthDate: '' }),
    }));
    if (digits.length === 14) {
      void lookupCnpjIfNeeded(masked);
    } else if (digits.length < 14) {
      lastCnpjLookup.current = '';
    }
  }

  const personDefined = form.personType === 'PF' || form.personType === 'PJ';
  const stickyPersonTypeRef = useRef('');
  if (personDefined) stickyPersonTypeRef.current = form.personType;
  const revealPersonType = stickyPersonTypeRef.current;

  async function onSubmit(event) {
    event.preventDefault();
    const err = validatePartyForm(form);
    if (err) {
      if (err.field === 'address') setAddressError(err.message);
      else setFieldError(err.message);
      return;
    }
    setSaving(true);
    try {
      const payload = partyPayloadFromForm(form);
      const filesToUpload = pendingFiles;
      let partyId = editingId;

      if (editingId) {
        await api(API.party(editingId), {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        const created = await api(API.parties, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        partyId = created?.id;
      }

      if (filesToUpload.length) {
        if (!partyId) {
          throw new Error('Cadastro salvo, mas não foi possível identificar o registro para anexos');
        }
        await uploadPendingFiles(partyId, filesToUpload);
      }

      notify(editingId ? 'Cadastro atualizado.' : 'Cadastro criado.', 'success');
      closeModal();
      await load();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSaving(false);
      setUploadingFiles(false);
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await api(API.party(deactivateTarget.id), {
        method: 'PATCH',
        body: JSON.stringify({ status: 'DISABLED' }),
      });
      setDeactivateTarget(null);
      closeDetail();
      notify('Cadastro desativado.', 'success');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setDeactivating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Clientes e fornecedores"
        description="Cadastre parceiros como cliente, fornecedor ou ambos, com CPF ou CNPJ."
        actions={
          <Button type="button" onClick={openCreate}>
            <IconPlus size={16} stroke={1.75} />
            Novo cadastro
          </Button>
        }
      />

      <ListToolbar className="anim-fade-up anim-delay-1">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, documento ou e-mail"
          label="Buscar cadastros"
        />
        <FilterChips
          label="Tipo de cadastro"
          value={filterKind}
          options={KIND_FILTER_OPTIONS}
          onChange={setFilterKind}
        />
      </ListToolbar>

      <PageSection title="Cadastros" delay={2} flush>
        <DataTable
          flush
          loading={loading}
          rows={rows}
          onRowClick={openDetail}
          emptyMessage={
            search.trim() || filterKind
              ? 'Nenhum resultado para os filtros atuais.'
              : 'Nenhum cliente ou fornecedor cadastrado ainda.'
          }
          columns={[
            {
              key: 'name',
              label: 'Nome',
              primary: true,
              render: (row) => (
                <>
                  <span className="data-table__primary">{row.legalName || displayPartyName(row)}</span>
                  {row.personType === 'PJ' && row.tradeName ? (
                    <span className="data-table__secondary data-table__secondary--trade">
                      {row.tradeName}
                    </span>
                  ) : null}
                </>
              ),
            },
            {
              key: 'document',
              label: 'Documento',
              muted: true,
              render: (row) => formatCpfCnpj(row.document),
            },
            {
              key: 'kind',
              label: 'Tipo',
              narrow: true,
              render: (row) => PARTY_KIND_LABEL[row.kind] || row.kind,
            },
            {
              key: 'personType',
              label: 'Pessoa',
              narrow: true,
              render: (row) => PERSON_TYPE_LABEL[row.personType] || row.personType,
            },
            {
              key: 'status',
              label: 'Status',
              narrow: true,
              render: (row) => (
                <Badge tone={STATUS_TONE[row.status] || 'neutral'}>
                  {STATUS_LABEL[row.status] || row.status}
                </Badge>
              ),
            },
            {
              key: 'actions',
              label: 'Ações',
              actions: true,
              render: (row) => (
                <>
                  <IconButton title="Editar" aria-label="Editar" onClick={() => openEdit(row)}>
                    <IconPencil size={16} stroke={1.75} />
                  </IconButton>
                  {row.status !== 'DISABLED' ? (
                    <IconButton
                      danger
                      title="Desativar"
                      aria-label="Desativar"
                      onClick={() => setDeactivateTarget(row)}
                    >
                      <IconTrash size={16} stroke={1.75} />
                    </IconButton>
                  ) : null}
                </>
              ),
            },
          ]}
        />
      </PageSection>

      <Modal
        open={Boolean(detailParty)}
        title={detailParty ? displayPartyName(detailParty) : 'Detalhes'}
        wide
        onClose={closeDetail}
        footer={
          detailParty ? (
            <>
              <Button variant="ghost" onClick={closeDetail}>
                Fechar
              </Button>
              {detailParty.status !== 'DISABLED' ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDeactivateTarget(detailParty);
                  }}
                >
                  Desativar
                </Button>
              ) : null}
              <Button type="button" onClick={() => openEdit(detailParty)}>
                <IconPencil size={16} stroke={1.75} />
                Editar
              </Button>
            </>
          ) : null
        }
      >
        {detailParty ? (
          <PartyDetailView
            party={detailParty}
            attachments={detailAttachments}
            attachmentsLoading={detailAttachmentsLoading}
            onViewAttachment={(file) => setPreviewAttachment(file)}
            onDownloadAttachment={(file) => void onDownloadExisting(file, detailParty.id)}
          />
        ) : null}
      </Modal>

      <AttachmentPreviewModal
        open={Boolean(detailParty && previewAttachment)}
        partyId={detailParty?.id}
        file={previewAttachment}
        onBack={() => setPreviewAttachment(null)}
        onDownload={(file) => void onDownloadExisting(file, detailParty?.id)}
      />

      <Modal
        open={modalOpen}
        title={editingId ? 'Editar cadastro' : 'Novo cadastro'}
        wide
        onClose={closeModal}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving || uploadingFiles}>
              Cancelar
            </Button>
            <Button
              form="party-form"
              type="submit"
              disabled={saving || cnpjLoading || uploadingFiles || attachmentsLoading}
            >
              <BusyLabel active={saving || uploadingFiles} idle="Salvar" />
            </Button>
          </>
        }
      >
        <form id="party-form" onSubmit={onSubmit} className="stack-tight">
          <ChoiceCards
            label="Este cadastro é"
            value={form.kind}
            options={KIND_CHOICE_OPTIONS}
            onChange={(kind) => {
              setFieldError('');
              setForm((f) => ({ ...f, kind }));
            }}
            error={fieldError && fieldError.includes('cliente') ? fieldError : ''}
          />

          <div className="form-soft-divider" role="separator" aria-hidden="true" />

          <div className="form-grid-doc">
            <MaskedField
              label={
                form.personType === 'PF'
                  ? 'CPF'
                  : form.personType === 'PJ'
                    ? 'CNPJ'
                    : 'CPF / CNPJ'
              }
              mask="cpfCnpj"
              required
              busy={cnpjLoading}
              value={form.document}
              onChange={onDocumentChange}
              placeholder={
                form.personType === 'PJ'
                  ? '00.000.000/0000-00'
                  : form.personType === 'PF'
                    ? '000.000.000-00'
                    : '000.000.000-00 ou 00.000.000/0000-00'
              }
              error={
                fieldError && fieldError.toLowerCase().includes('cpf')
                  ? fieldError
                  : fieldError && fieldError.toLowerCase().includes('cnpj')
                    ? fieldError
                    : ''
              }
            />
            <SegmentedControl
              label="Tipo de pessoa"
              variant="soft"
              className="form-grid-doc__type"
              value={form.personType}
              options={PERSON_TYPE_OPTIONS}
              onChange={onPersonTypeChange}
            />
          </div>

          <FormReveal open={personDefined} contentKey={revealPersonType}>
                {revealPersonType === 'PF' ? (
                  <div className="form-grid-name-birth">
                    <MaskedField
                      label="Nome completo"
                      mask="uppercase"
                      required
                      value={form.legalName}
                      onChange={(e) => {
                        setFieldError('');
                        setForm((f) => {
                          const legalName = e.target.value;
                          const next = { ...f, legalName };
                          if (f.bankHolderKind === ACCOUNT_HOLDER_KIND.OWN) {
                            next.bankHolderName = legalName;
                          }
                          return next;
                        });
                      }}
                      inputMode="text"
                      autoComplete="name"
                      error={
                        fieldError && fieldError.toLowerCase().includes('nome')
                          ? fieldError
                          : ''
                      }
                    />
                    <DateInput
                      label="Data de nascimento"
                      value={form.birthDate}
                      onChange={(e) => {
                        setFieldError('');
                        setForm((f) => ({ ...f, birthDate: e.target.value }));
                      }}
                      error={
                        fieldError && fieldError.toLowerCase().includes('nascimento')
                          ? fieldError
                          : ''
                      }
                    />
                  </div>
                ) : null}

                {revealPersonType === 'PJ' ? (
                  <>
                    <div className="form-grid-2">
                      <MaskedField
                        label="Razão social"
                        mask="uppercase"
                        required
                        value={form.legalName}
                        onChange={(e) => {
                          setFieldError('');
                          setForm((f) => {
                            const legalName = e.target.value;
                            const next = { ...f, legalName };
                            if (f.bankHolderKind === ACCOUNT_HOLDER_KIND.OWN) {
                              next.bankHolderName = legalName;
                            }
                            return next;
                          });
                        }}
                        inputMode="text"
                        autoComplete="organization"
                        error={
                          fieldError &&
                          (fieldError.toLowerCase().includes('nome') ||
                            fieldError.toLowerCase().includes('razão'))
                            ? fieldError
                            : ''
                        }
                      />
                      <MaskedField
                        label="Nome fantasia"
                        mask="uppercase"
                        value={form.tradeName}
                        onChange={(e) => setForm((f) => ({ ...f, tradeName: e.target.value }))}
                        inputMode="text"
                        autoComplete="organization"
                      />
                    </div>
                    <TextField
                      label="Responsável"
                      value={form.contactName}
                      onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                    />
                  </>
                ) : null}

                <div className="form-grid-3">
                  <TextField
                    label="E-mail"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                  <MaskedField
                    label="Telefone"
                    mask="phone"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                  <TextField
                    label="Usuário do WhatsApp"
                    value={form.whatsappUsername}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        whatsappUsername: formatWhatsappUsername(e.target.value),
                      }))
                    }
                    prefix="@"
                    placeholder="usuario"
                    autoComplete="off"
                  />
                </div>

                <AddressField
                  value={form.address}
                  onChange={(address) => {
                    setAddressError('');
                    setForm((f) => ({ ...f, address }));
                  }}
                  error={addressError}
                  hint=""
                />

                <div className="form-soft-divider" role="separator" aria-hidden="true" />

                <section className="form-block">
                  <header className="form-block__header">
                    <h3 className="form-block__title">Informações financeiras</h3>
                    <p className="form-block__desc">Dados de cobrança e conta bancária</p>
                  </header>

                  <div className="billing-contacts">
                    <div className="billing-contacts__header">
                      <p className="form-block__subtitle">Contatos de cobrança</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            billingContacts: [...(f.billingContacts || []), blankBillingContact()],
                          }))
                        }
                      >
                        <IconPlus size={16} stroke={1.75} />
                        Adicionar contato
                      </Button>
                    </div>

                    {(form.billingContacts || []).map((contact, index) => (
                      <div className="billing-contact" key={contact.key || index}>
                        <div className="billing-contact__row">
                          <div className="billing-contact__fields">
                            <MaskedField
                              label="Nome do contato"
                              mask="uppercase"
                              value={contact.name}
                              onChange={(e) => {
                                const name = e.target.value;
                                setForm((f) => ({
                                  ...f,
                                  billingContacts: (f.billingContacts || []).map((item, i) =>
                                    i === index ? { ...item, name } : item,
                                  ),
                                }));
                              }}
                              autoComplete="name"
                            />
                            <TextField
                              label="E-mail"
                              type="email"
                              value={contact.email}
                              onChange={(e) => {
                                setFieldError('');
                                const email = e.target.value;
                                setForm((f) => ({
                                  ...f,
                                  billingContacts: (f.billingContacts || []).map((item, i) =>
                                    i === index ? { ...item, email } : item,
                                  ),
                                }));
                              }}
                            />
                            <SwitchField
                              size="sm"
                              className="billing-contact__switch"
                              aria-label="Receber cobrança"
                              label={
                                <>
                                  Receber
                                  <br />
                                  cobrança
                                </>
                              }
                              checked={contact.emailActive !== false}
                              onChange={(emailActive) => {
                                setForm((f) => ({
                                  ...f,
                                  billingContacts: (f.billingContacts || []).map((item, i) =>
                                    i === index ? { ...item, emailActive } : item,
                                  ),
                                }));
                              }}
                            />
                          </div>
                          {(form.billingContacts || []).length > 1 ? (
                            <IconButton
                              type="button"
                              danger
                              className="billing-contact__remove"
                              aria-label="Remover contato"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  billingContacts: (f.billingContacts || []).filter(
                                    (_, i) => i !== index,
                                  ),
                                }))
                              }
                            >
                              <IconTrash size={16} stroke={1.75} />
                            </IconButton>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {fieldError && fieldError.toLowerCase().includes('cobrança') ? (
                      <p className="field__error">{fieldError}</p>
                    ) : null}
                  </div>

                  <p className="form-block__subtitle">Dados bancários</p>

                  <SelectField
                    label="Banco"
                    searchable
                    placeholder="Selecione o banco"
                    value={form.bankCode}
                    options={BRAZILIAN_BANK_OPTIONS}
                    onChange={(e) => setForm((f) => ({ ...f, bankCode: e.target.value }))}
                  />

                  <div className="form-grid-3">
                    <MaskedField
                      label="Agência"
                      mask="bankAgency"
                      value={form.bankAgency}
                      onChange={(e) => setForm((f) => ({ ...f, bankAgency: e.target.value }))}
                      placeholder="0000"
                    />
                    <MaskedField
                      label="Conta"
                      mask="bankAccount"
                      value={form.bankAccount}
                      onChange={(e) => setForm((f) => ({ ...f, bankAccount: e.target.value }))}
                      placeholder="00000-0"
                    />
                    <SelectField
                      label="Tipo de conta"
                      placeholder="Selecione"
                      value={form.bankAccountType}
                      options={ACCOUNT_TYPE_OPTIONS}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, bankAccountType: e.target.value }))
                      }
                    />
                  </div>

                  <TextField
                    label="Chave Pix"
                    value={form.pixKey}
                    onChange={(e) => setForm((f) => ({ ...f, pixKey: e.target.value }))}
                    placeholder="CPF, e-mail, telefone ou chave aleatória"
                    autoComplete="off"
                  />

                  <div className="form-grid-2">
                    <SelectField
                      label="Titularidade"
                      placeholder="Selecione"
                      value={form.bankHolderKind}
                      options={ACCOUNT_HOLDER_OPTIONS}
                      onChange={(e) => {
                        const bankHolderKind = e.target.value;
                        setFieldError('');
                        setForm((f) => ({
                          ...f,
                          bankHolderKind,
                          bankHolderName:
                            bankHolderKind === ACCOUNT_HOLDER_KIND.OWN
                              ? f.legalName
                              : bankHolderKind === ACCOUNT_HOLDER_KIND.OTHER
                                ? f.bankHolderName
                                : '',
                        }));
                      }}
                      error={
                        fieldError && fieldError.toLowerCase().includes('titularidade')
                          ? fieldError
                          : ''
                      }
                    />
                    {form.bankHolderKind === ACCOUNT_HOLDER_KIND.OWN ? (
                      <TextField label="Titular" value={form.legalName} disabled readOnly />
                    ) : form.bankHolderKind === ACCOUNT_HOLDER_KIND.OTHER ? (
                      <MaskedField
                        label="Nome do titular"
                        mask="uppercase"
                        value={form.bankHolderName}
                        onChange={(e) => {
                          setFieldError('');
                          setForm((f) => ({ ...f, bankHolderName: e.target.value }));
                        }}
                        error={
                          fieldError && fieldError.toLowerCase().includes('titular')
                            ? fieldError
                            : ''
                        }
                      />
                    ) : (
                      <TextField
                        label="Titular"
                        value=""
                        disabled
                        placeholder="Selecione a titularidade"
                      />
                    )}
                  </div>
                </section>

                <TextareaField
                  label="Observações"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                />

                <div className="form-soft-divider" role="separator" aria-hidden="true" />

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

                {editingId ? (
                  <SelectField
                    label="Status"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="DISABLED">Desativado</option>
                  </SelectField>
                ) : null}
          </FormReveal>

          {fieldError &&
          !fieldError.toLowerCase().includes('cpf') &&
          !fieldError.toLowerCase().includes('cnpj') &&
          !fieldError.toLowerCase().includes('nome') &&
          !fieldError.toLowerCase().includes('razão') &&
          !fieldError.toLowerCase().includes('cobrança') &&
          !fieldError.includes('cliente') ? (
            <p className="field__error">{fieldError}</p>
          ) : null}
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deactivateTarget)}
        title="Desativar cadastro"
        danger
        confirmLabel="Desativar"
        loading={deactivating}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => void confirmDeactivate()}
      >
        {deactivateTarget
          ? `Confirma a desativação de "${displayPartyName(deactivateTarget)}"?`
          : null}
      </ConfirmModal>
    </div>
  );
}
