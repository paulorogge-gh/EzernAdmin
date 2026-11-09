import { useEffect, useState } from 'react';
import { IconMailForward, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { AddressField } from '../components/ui/AddressField';
import { Badge } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { CheckboxField, SelectField, TextField } from '../components/ui/Field';
import { ConfirmModal, Modal } from '../components/ui/Modal';
import { PageHeader, PageSection } from '../components/ui/Page';
import { BusyLabel } from '../components/ui/Processing';
import { UserDetailView } from '../components/users/UserDetailView';
import { emptyAddress, formatPhoneBr, normalizeAddress } from '../lib/address';
import { api } from '../lib/api';
import { API } from '../lib/httpSurface';
import {
  ROLE_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  blankInviteForm,
  validateAddressForm,
} from '../lib/userForm';
import { useNotify } from '../contexts/NotifyContext';

export function UsersPage() {
  const { notify } = useNotify();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteSaving, setInviteSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [form, setForm] = useState(blankInviteForm);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [inviteAddressError, setInviteAddressError] = useState('');
  const [editAddressError, setEditAddressError] = useState('');
  const [microsoftSsoEnabled, setMicrosoftSsoEnabled] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRows(await api(API.members));
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    void api(API.publicConfig)
      .then((cfg) => setMicrosoftSsoEnabled(Boolean(cfg?.microsoftSsoEnabled)))
      .catch(() => setMicrosoftSsoEnabled(false));
  }, []);

  function openInvite() {
    setForm(blankInviteForm());
    setInviteAddressError('');
    setInviteOpen(true);
  }

  function closeInvite() {
    setInviteOpen(false);
    setInviteAddressError('');
    setForm(blankInviteForm());
  }

  async function onInvite(event) {
    event.preventDefault();
    const err = validateAddressForm(form.address);
    if (err) {
      setInviteAddressError(err);
      return;
    }
    setInviteSaving(true);
    try {
      await api(API.members, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          ssoRequired: microsoftSsoEnabled ? form.ssoRequired : false,
        }),
      });
      closeInvite();
      notify('Convite enviado.', 'success');
      await load();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setInviteSaving(false);
    }
  }

  async function onSaveEdit(event) {
    event.preventDefault();
    if (!editing) return;
    const err = validateAddressForm(editing.address);
    if (err) {
      setEditAddressError(err);
      return;
    }
    setEditSaving(true);
    try {
      await api(API.member(editing.id), {
        method: 'PATCH',
        body: JSON.stringify({
          name: editing.name,
          phone: editing.phone,
          whatsappUsername: editing.whatsappUsername,
          address: editing.address,
          role: editing.role,
          status: editing.status,
          ssoRequired: microsoftSsoEnabled ? editing.ssoRequired : false,
        }),
      });
      setEditing(null);
      setEditAddressError('');
      notify('Usuário atualizado.', 'success');
      await load();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setEditSaving(false);
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await api(API.member(deactivateTarget.id), {
        method: 'PATCH',
        body: JSON.stringify({ status: 'DISABLED' }),
      });
      setDeactivateTarget(null);
      closeDetail();
      notify('Usuário desativado.', 'success');
      await load();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setDeactivating(false);
    }
  }

  async function resend(user) {
    try {
      await api(API.memberResend(user.id), { method: 'POST' });
      notify('Convite reenviado.', 'success');
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  function openDetail(user) {
    setDetailUser(user);
  }

  function closeDetail() {
    setDetailUser(null);
  }

  function openEdit(user) {
    closeDetail();
    setEditAddressError('');
    setEditing({
      ...user,
      phone: formatPhoneBr(user.phone || ''),
      whatsappUsername: user.whatsappUsername || '',
      address: normalizeAddress(user.address || emptyAddress()),
    });
  }

  return (
    <div>
      <PageHeader
        title="Usuários"
        description="Convide pessoas, ajuste perfis e mantenha o acesso sob controle."
        actions={
          <Button type="button" onClick={openInvite}>
            <IconPlus size={16} stroke={1.75} />
            Convidar usuário
          </Button>
        }
      />

      <PageSection title="Equipe" delay={1} flush>
        <DataTable
          flush
          loading={loading}
          rows={rows}
          onRowClick={openDetail}
          emptyMessage="Nenhum usuário cadastrado ainda."
          columns={[
            {
              key: 'name',
              label: 'Nome',
              primary: true,
              secondary: (user) => user.phone || user.whatsappUsername || '',
            },
            {
              key: 'email',
              label: 'E-mail',
              muted: true,
            },
            {
              key: 'role',
              label: 'Perfil',
              narrow: true,
              render: (user) => ROLE_LABEL[user.role] || user.role,
            },
            {
              key: 'status',
              label: 'Status',
              narrow: true,
              render: (user) => (
                <Badge tone={STATUS_TONE[user.status] || 'neutral'}>
                  {STATUS_LABEL[user.status] || user.status}
                </Badge>
              ),
            },
            {
              key: 'actions',
              label: 'Ações',
              actions: true,
              render: (user) => (
                <>
                  {user.status === 'INVITED' ? (
                    <IconButton
                      title="Reenviar convite"
                      aria-label="Reenviar convite"
                      onClick={() => void resend(user)}
                    >
                      <IconMailForward size={16} stroke={1.75} />
                    </IconButton>
                  ) : null}
                  <IconButton
                    title="Editar"
                    aria-label="Editar"
                    onClick={() => openEdit(user)}
                  >
                    <IconPencil size={16} stroke={1.75} />
                  </IconButton>
                  {user.status !== 'DISABLED' ? (
                    <IconButton
                      danger
                      title="Desativar"
                      aria-label="Desativar"
                      onClick={() => setDeactivateTarget(user)}
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
        open={Boolean(detailUser)}
        title={detailUser?.name || 'Detalhes'}
        wide
        onClose={closeDetail}
        footer={
          detailUser ? (
            <>
              <Button variant="ghost" onClick={closeDetail}>
                Fechar
              </Button>
              {detailUser.status === 'INVITED' ? (
                <Button variant="ghost" onClick={() => void resend(detailUser)}>
                  <IconMailForward size={16} stroke={1.75} />
                  Reenviar convite
                </Button>
              ) : null}
              {detailUser.status !== 'DISABLED' ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDeactivateTarget(detailUser);
                  }}
                >
                  Desativar
                </Button>
              ) : null}
              <Button type="button" onClick={() => openEdit(detailUser)}>
                <IconPencil size={16} stroke={1.75} />
                Editar
              </Button>
            </>
          ) : null
        }
      >
        {detailUser ? <UserDetailView user={detailUser} /> : null}
      </Modal>

      <Modal
        open={inviteOpen}
        title="Convidar usuário"
        wide
        onClose={closeInvite}
        footer={
          <>
            <Button variant="ghost" onClick={closeInvite} disabled={inviteSaving}>
              Cancelar
            </Button>
            <Button form="invite-user-form" type="submit" disabled={inviteSaving}>
              <BusyLabel active={inviteSaving} idle="Convidar" />
            </Button>
          </>
        }
      >
        <form id="invite-user-form" onSubmit={onInvite} className="stack-tight">
          <TextField
            label="Nome"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <TextField
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <TextField
            label="Número celular"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: formatPhoneBr(e.target.value) }))}
            inputMode="tel"
            placeholder="(00) 00000-0000"
          />
          <TextField
            label="Usuário do WhatsApp"
            value={form.whatsappUsername}
            onChange={(e) =>
              setForm((f) => ({ ...f, whatsappUsername: e.target.value.replace(/^@+/, '') }))
            }
            prefix="@"
            placeholder="usuario"
            autoComplete="off"
          />
          <div className={microsoftSsoEnabled ? 'form-row-profile-sso' : undefined}>
            <SelectField
              label="Perfil"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              <option value="MEMBER">Membro</option>
              <option value="ADMIN">Administrador</option>
              <option value="OWNER">Proprietário</option>
            </SelectField>
            {microsoftSsoEnabled ? (
              <div className="form-row-profile-sso__check">
                <CheckboxField
                  label="Exigir SSO"
                  checked={form.ssoRequired}
                  onChange={(e) => setForm((f) => ({ ...f, ssoRequired: e.target.checked }))}
                />
              </div>
            ) : null}
          </div>
          <AddressField
            value={form.address}
            onChange={(address) => {
              setInviteAddressError('');
              setForm((f) => ({ ...f, address }));
            }}
            error={inviteAddressError}
            hint=""
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(editing)}
        title="Editar usuário"
        wide
        onClose={() => {
          setEditing(null);
          setEditAddressError('');
        }}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(null);
                setEditAddressError('');
              }}
            >
              Cancelar
            </Button>
            <Button form="edit-user-form" type="submit" disabled={editSaving}>
              <BusyLabel active={editSaving} idle="Salvar" />
            </Button>
          </>
        }
      >
        {editing ? (
          <form id="edit-user-form" onSubmit={onSaveEdit} className="stack-tight">
            <TextField
              label="Nome"
              value={editing.name}
              onChange={(e) => setEditing((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <TextField label="E-mail" type="email" value={editing.email || ''} disabled />
            <TextField
              label="Número celular"
              value={editing.phone || ''}
              onChange={(e) =>
                setEditing((f) => ({ ...f, phone: formatPhoneBr(e.target.value) }))
              }
              inputMode="tel"
              placeholder="(00) 00000-0000"
            />
            <TextField
              label="Usuário do WhatsApp"
              value={editing.whatsappUsername || ''}
              onChange={(e) =>
                setEditing((f) => ({
                  ...f,
                  whatsappUsername: e.target.value.replace(/^@+/, ''),
                }))
              }
              prefix="@"
              placeholder="usuario"
              autoComplete="off"
            />
            <AddressField
              value={editing.address}
              onChange={(address) => {
                setEditAddressError('');
                setEditing((f) => ({ ...f, address }));
              }}
              error={editAddressError}
              hint=""
            />
            <div className={microsoftSsoEnabled ? 'form-row-profile-sso' : undefined}>
              <SelectField
                label="Perfil"
                value={editing.role}
                onChange={(e) => setEditing((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="MEMBER">Membro</option>
                <option value="ADMIN">Administrador</option>
                <option value="OWNER">Proprietário</option>
              </SelectField>
              {microsoftSsoEnabled ? (
                <div className="form-row-profile-sso__check">
                  <CheckboxField
                    label="Exigir SSO"
                    checked={Boolean(editing.ssoRequired)}
                    onChange={(e) => setEditing((f) => ({ ...f, ssoRequired: e.target.checked }))}
                  />
                </div>
              ) : null}
            </div>
            <SelectField
              label="Status"
              value={editing.status}
              onChange={(e) => setEditing((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="ACTIVE">Ativo</option>
              <option value="INVITED">Convidado</option>
              <option value="DISABLED">Desativado</option>
            </SelectField>
          </form>
        ) : null}
      </Modal>

      <ConfirmModal
        open={Boolean(deactivateTarget)}
        title="Desativar usuário"
        danger
        confirmLabel="Desativar"
        loading={deactivating}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => void confirmDeactivate()}
      >
        {deactivateTarget
          ? `Confirma a desativação de "${deactivateTarget.name}"? A pessoa perderá o acesso ao painel.`
          : null}
      </ConfirmModal>
    </div>
  );
}
