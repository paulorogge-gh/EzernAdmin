import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { SelectField, TextField, TextareaField } from '../../components/ui/Field';
import { PageSection } from '../../components/ui/Page';
import { BusyLabel } from '../../components/ui/Processing';
import { useNotify } from '../../contexts/NotifyContext';
import { api } from '../../lib/api';
import { API } from '../../lib/httpSurface';

export function SettingsAsaasPage() {
  const { notify } = useNotify();
  const [profile, setProfile] = useState(null);
  const [asaasApiKey, setAsaasApiKey] = useState('');
  const [asaasEnv, setAsaasEnv] = useState('sandbox');
  const [nfMunicipalServiceId, setNfMunicipalServiceId] = useState('');
  const [nfMunicipalServiceCode, setNfMunicipalServiceCode] = useState('');
  const [nfMunicipalServiceName, setNfMunicipalServiceName] = useState('');
  const [nfDescriptionDefault, setNfDescriptionDefault] = useState('');
  const [municipalOptions, setMunicipalOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncingFiscal, setSyncingFiscal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api(API.orgProfile);
      setProfile(data);
      setAsaasEnv(data.asaasEnv || 'sandbox');
      setNfMunicipalServiceId(data.nfMunicipalServiceId || '');
      setNfMunicipalServiceCode(data.nfMunicipalServiceCode || '');
      setNfMunicipalServiceName(data.nfMunicipalServiceName || '');
      setNfDescriptionDefault(data.nfDescriptionDefault || 'Serviços de suporte técnico');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function loadMunicipalServices() {
    try {
      const rows = await api(API.asaasMunicipalServices);
      const list = Array.isArray(rows) ? rows : [];
      setMunicipalOptions(
        list.map((item) => ({
          value: String(item.id || item.municipalServiceId || ''),
          label: `${item.description || item.name || item.id}`,
          code: item.code || item.municipalServiceCode || '',
          name: item.description || item.name || '',
        })),
      );
      notify('Serviços municipais carregados do Asaas.', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function onSave(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        asaasEnv,
        nfMunicipalServiceId,
        nfMunicipalServiceCode,
        nfMunicipalServiceName,
        nfDescriptionDefault,
      };
      if (asaasApiKey.trim()) payload.asaasApiKey = asaasApiKey.trim();
      const data = await api(API.orgProfile, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setProfile(data);
      setAsaasApiKey('');
      notify('Configurações Asaas salvas.', 'success');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function syncFiscal() {
    setSyncingFiscal(true);
    try {
      await api(API.asaasFiscalInfo, { method: 'POST', body: JSON.stringify({}) });
      notify('Informações fiscais enviadas ao Asaas.', 'success');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSyncingFiscal(false);
    }
  }

  async function rotateToken() {
    try {
      const data = await api(API.orgProfile, {
        method: 'PUT',
        body: JSON.stringify({ rotateWebhookToken: true }),
      });
      setProfile(data);
      notify('Token de webhook regenerado. Atualize a URL no Asaas.', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  if (loading) return <PageSection title="Asaas / NFS-e">Carregando...</PageSection>;

  const webhookUrl = `${window.location.origin}/g/h/a?token=SEU_TOKEN`;

  return (
    <PageSection title="Asaas / NFS-e">
      <form className="stack-tight tx-form" onSubmit={onSave}>
        <SelectField
          label="Ambiente"
          value={asaasEnv}
          onChange={(e) => setAsaasEnv(e.target.value)}
          options={[
            { value: 'sandbox', label: 'Sandbox' },
            { value: 'production', label: 'Produção' },
          ]}
        />
        <TextField
          label={
            profile?.asaasApiKeyConfigured
              ? 'API key Asaas (deixe em branco para manter)'
              : 'API key Asaas'
          }
          type="password"
          value={asaasApiKey}
          onChange={(e) => setAsaasApiKey(e.target.value)}
          autoComplete="off"
        />
        <TextField
          label="Descrição padrão da NFS-e"
          value={nfDescriptionDefault}
          onChange={(e) => setNfDescriptionDefault(e.target.value)}
        />
        <div className="form-grid-2">
          <SelectField
            label="Serviço municipal (Asaas)"
            value={nfMunicipalServiceId}
            onChange={(e) => {
              const opt = municipalOptions.find((o) => o.value === e.target.value);
              setNfMunicipalServiceId(e.target.value);
              if (opt) {
                setNfMunicipalServiceCode(opt.code || '');
                setNfMunicipalServiceName(opt.name || '');
              }
            }}
            options={[
              { value: '', label: 'Selecione ou carregue do Asaas' },
              ...municipalOptions,
            ]}
          />
          <div className="tx-form__settle">
            <Button type="button" variant="ghost" onClick={() => void loadMunicipalServices()}>
              Buscar serviços no Asaas
            </Button>
          </div>
        </div>
        <div className="form-grid-2">
          <TextField
            label="Código serviço municipal"
            value={nfMunicipalServiceCode}
            onChange={(e) => setNfMunicipalServiceCode(e.target.value)}
          />
          <TextField
            label="Nome serviço municipal"
            value={nfMunicipalServiceName}
            onChange={(e) => setNfMunicipalServiceName(e.target.value)}
          />
        </div>
        <TextareaField
          label="URL do webhook (cole no Asaas)"
          rows={2}
          readOnly
          value={webhookUrl}
          hint="Use o token gerado nas configurações da empresa (x-billing-webhook-token ou ?token=)."
        />
        <div className="form-grid-2">
          <Button type="submit" disabled={saving}>
            <BusyLabel active={saving} idle="Salvar Asaas" />
          </Button>
          <Button type="button" variant="ghost" onClick={() => void rotateToken()}>
            Regenerar token webhook
          </Button>
        </div>
        <Button type="button" variant="ghost" disabled={syncingFiscal} onClick={() => void syncFiscal()}>
          <BusyLabel active={syncingFiscal} idle="Sincronizar fiscalInfo no Asaas" />
        </Button>
      </form>
    </PageSection>
  );
}
