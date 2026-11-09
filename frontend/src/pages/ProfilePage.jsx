import { useEffect, useState } from 'react';
import { AddressField } from '../components/ui/AddressField';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { PageHeader, PageSection } from '../components/ui/Page';
import { BusyLabel } from '../components/ui/Processing';
import { emptyAddress, formatPhoneBr, normalizeAddress } from '../lib/address';
import { api } from '../lib/api';
import { API } from '../lib/httpSurface';
import { validateAddressForm } from '../lib/userForm';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/NotifyContext';

function profileFromUser(user) {
  return {
    name: user?.name || '',
    email: user?.email || '',
    phone: formatPhoneBr(user?.phone || ''),
    whatsappUsername: user?.whatsappUsername || '',
    address: normalizeAddress(user?.address || emptyAddress()),
  };
}

export function ProfilePage() {
  const { user, refreshMe } = useAuth();
  const { notify } = useNotify();
  const [form, setForm] = useState(() => profileFromUser(user));
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [addressError, setAddressError] = useState('');

  useEffect(() => {
    setForm(profileFromUser(user));
  }, [user]);

  async function onSubmit(event) {
    event.preventDefault();
    const err = validateAddressForm(form.address);
    if (err) {
      setAddressError(err);
      return;
    }

    setSaving(true);
    try {
      await api(API.me, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          whatsappUsername: form.whatsappUsername,
          address: form.address,
          ...(newPassword ? { currentPassword, newPassword } : {}),
        }),
      });
      await refreshMe();
      setCurrentPassword('');
      setNewPassword('');
      setAddressError('');
      notify('Perfil atualizado.', 'success');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-form">
      <PageHeader title="Meu perfil" description="Atualize seus dados de acesso e endereço." />
      <PageSection delay={1}>
        <form onSubmit={onSubmit} className="stack-tight">
          <TextField
            label="Nome"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <TextField label="E-mail" type="email" value={form.email} disabled />
          <TextField
            label="Número celular"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: formatPhoneBr(e.target.value) }))}
            inputMode="tel"
            autoComplete="tel"
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
          <AddressField
            value={form.address}
            onChange={(address) => {
              setAddressError('');
              setForm((f) => ({ ...f, address }));
            }}
            error={addressError}
            hint=""
          />
          <TextField
            label="Senha atual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            hint="Obrigatória apenas se for trocar a senha"
          />
          <TextField
            label="Nova senha"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={12}
          />
          <Button type="submit" disabled={saving}>
            <BusyLabel active={saving} idle="Salvar alterações" />
          </Button>
        </form>
      </PageSection>
    </div>
  );
}
