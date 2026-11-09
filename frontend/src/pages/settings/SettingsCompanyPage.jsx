import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { SelectField, TextField } from '../../components/ui/Field';
import { PageSection } from '../../components/ui/Page';
import { BusyLabel } from '../../components/ui/Processing';
import { useNotify } from '../../contexts/NotifyContext';
import { api } from '../../lib/api';
import { API } from '../../lib/httpSurface';

function blank() {
  return {
    legalName: '',
    tradeName: '',
    document: '',
    stateRegistration: '',
    municipalInscription: '',
    email: '',
    phone: '',
    addressStreet: '',
    addressNumber: '',
    addressComplement: '',
    addressNeighborhood: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    cnaePrimary: '',
    taxRegime: 'simples_nacional',
    simplesAnexoDefault: 'V',
    payroll12m: '',
    defaultAccountId: '',
    defaultReceivableCategoryId: '',
    defaultPayableCategoryId: '',
    defaultTaxCategoryId: '',
    defaultCostCenterId: '',
  };
}

export function SettingsCompanyPage() {
  const { notify } = useNotify();
  const [form, setForm] = useState(blank);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [profile, accs, cats, centers] = await Promise.all([
        api(API.orgProfile),
        api(API.financeAccounts),
        api(API.financeCategories),
        api(API.financeCostCenters),
      ]);
      setAccounts(Array.isArray(accs) ? accs : []);
      setCategories(Array.isArray(cats) ? cats : []);
      setCostCenters(Array.isArray(centers) ? centers : []);
      setForm({
        ...blank(),
        ...profile,
        payroll12m: profile.payroll12m != null ? String(profile.payroll12m) : '',
        defaultAccountId: profile.defaultAccountId || '',
        defaultReceivableCategoryId: profile.defaultReceivableCategoryId || '',
        defaultPayableCategoryId: profile.defaultPayableCategoryId || '',
        defaultTaxCategoryId: profile.defaultTaxCategoryId || '',
        defaultCostCenterId: profile.defaultCostCenterId || '',
      });
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSave(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api(API.orgProfile, {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          payroll12m: form.payroll12m === '' ? 0 : Number(form.payroll12m),
          defaultAccountId: form.defaultAccountId || null,
          defaultReceivableCategoryId: form.defaultReceivableCategoryId || null,
          defaultPayableCategoryId: form.defaultPayableCategoryId || null,
          defaultTaxCategoryId: form.defaultTaxCategoryId || null,
          defaultCostCenterId: form.defaultCostCenterId || null,
        }),
      });
      notify('Dados da empresa salvos.', 'success');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageSection title="Empresa">Carregando...</PageSection>;

  const receitaCats = categories.filter((c) => c.type === 'receita');
  const despesaCats = categories.filter((c) => c.type === 'despesa');

  return (
    <PageSection title="Empresa">
      <form className="stack-tight tx-form" onSubmit={onSave}>
        <div className="form-grid-2">
          <TextField
            label="Razão social"
            required
            value={form.legalName}
            onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
          />
          <TextField
            label="Nome fantasia"
            value={form.tradeName}
            onChange={(e) => setForm((f) => ({ ...f, tradeName: e.target.value }))}
          />
        </div>
        <div className="form-grid-3">
          <TextField
            label="CNPJ"
            value={form.document}
            onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))}
          />
          <TextField
            label="Inscrição estadual"
            value={form.stateRegistration}
            onChange={(e) => setForm((f) => ({ ...f, stateRegistration: e.target.value }))}
          />
          <TextField
            label="Inscrição municipal"
            value={form.municipalInscription}
            onChange={(e) => setForm((f) => ({ ...f, municipalInscription: e.target.value }))}
          />
        </div>
        <div className="form-grid-2">
          <TextField
            label="E-mail"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <TextField
            label="Telefone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div className="form-grid-2">
          <TextField
            label="Logradouro"
            value={form.addressStreet}
            onChange={(e) => setForm((f) => ({ ...f, addressStreet: e.target.value }))}
          />
          <TextField
            label="Número"
            value={form.addressNumber}
            onChange={(e) => setForm((f) => ({ ...f, addressNumber: e.target.value }))}
          />
        </div>
        <div className="form-grid-3">
          <TextField
            label="Bairro"
            value={form.addressNeighborhood}
            onChange={(e) => setForm((f) => ({ ...f, addressNeighborhood: e.target.value }))}
          />
          <TextField
            label="Cidade"
            value={form.addressCity}
            onChange={(e) => setForm((f) => ({ ...f, addressCity: e.target.value }))}
          />
          <TextField
            label="UF"
            value={form.addressState}
            onChange={(e) => setForm((f) => ({ ...f, addressState: e.target.value }))}
          />
        </div>
        <div className="form-grid-3">
          <TextField
            label="CEP"
            value={form.addressZip}
            onChange={(e) => setForm((f) => ({ ...f, addressZip: e.target.value }))}
          />
          <TextField
            label="CNAE principal"
            value={form.cnaePrimary}
            onChange={(e) => setForm((f) => ({ ...f, cnaePrimary: e.target.value }))}
          />
          <SelectField
            label="Anexo padrão Simples"
            value={form.simplesAnexoDefault}
            onChange={(e) => setForm((f) => ({ ...f, simplesAnexoDefault: e.target.value }))}
            options={[
              { value: 'III', label: 'Anexo III' },
              { value: 'V', label: 'Anexo V' },
            ]}
          />
        </div>
        <CurrencyInput
          label="Folha de salários 12 meses (Fator R)"
          value={form.payroll12m}
          onChange={(e) => setForm((f) => ({ ...f, payroll12m: e.target.value }))}
        />
        <div className="form-grid-2">
          <SelectField
            label="Conta padrão"
            value={form.defaultAccountId}
            onChange={(e) => setForm((f) => ({ ...f, defaultAccountId: e.target.value }))}
            options={[
              { value: '', label: 'Selecione' },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
          <SelectField
            label="Centro de custo padrão"
            value={form.defaultCostCenterId}
            onChange={(e) => setForm((f) => ({ ...f, defaultCostCenterId: e.target.value }))}
            options={[
              { value: '', label: 'Selecione' },
              ...costCenters.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
        <div className="form-grid-3">
          <SelectField
            label="Categoria receita (AR)"
            value={form.defaultReceivableCategoryId}
            onChange={(e) =>
              setForm((f) => ({ ...f, defaultReceivableCategoryId: e.target.value }))
            }
            options={[
              { value: '', label: 'Selecione' },
              ...receitaCats.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <SelectField
            label="Categoria despesa (AP)"
            value={form.defaultPayableCategoryId}
            onChange={(e) =>
              setForm((f) => ({ ...f, defaultPayableCategoryId: e.target.value }))
            }
            options={[
              { value: '', label: 'Selecione' },
              ...despesaCats.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <SelectField
            label="Categoria impostos (DAS)"
            value={form.defaultTaxCategoryId}
            onChange={(e) => setForm((f) => ({ ...f, defaultTaxCategoryId: e.target.value }))}
            options={[
              { value: '', label: 'Selecione' },
              ...despesaCats.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
        <div>
          <Button type="submit" disabled={saving}>
            <BusyLabel active={saving} idle="Salvar empresa" />
          </Button>
        </div>
      </form>
    </PageSection>
  );
}
