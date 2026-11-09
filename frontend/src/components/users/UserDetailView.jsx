import { Badge } from '../ui/Badge';
import {
  DetailGrid,
  DetailItem,
  DetailSection,
  DetailView,
} from '../ui/DetailView';
import { formatCep, formatPhoneBr } from '../../lib/masks';
import { ROLE_LABEL, STATUS_LABEL, STATUS_TONE } from '../../lib/userForm';

function formatAddress(address) {
  if (!address) return '';
  if (address.formatted) return address.formatted;
  const line1 = [address.street, address.number].filter(Boolean).join(', ');
  const line2 = [address.complement, address.neighborhood || address.district]
    .filter(Boolean)
    .join(' · ');
  const line3 = [address.city, address.state].filter(Boolean).join(' / ');
  const zip = address.zip ? formatCep(address.zip) : '';
  return [line1, line2, line3, zip, address.country].filter(Boolean).join('\n');
}

export function UserDetailView({ user }) {
  if (!user) return null;
  const addressText = formatAddress(user.address);

  return (
    <DetailView>
      <DetailSection title="Identificação">
        <DetailGrid columns={3}>
          <DetailItem label="Nome" value={user.name} />
          <DetailItem label="Perfil" value={ROLE_LABEL[user.role] || user.role} />
          <DetailItem label="Status">
            <Badge tone={STATUS_TONE[user.status] || 'neutral'}>
              {STATUS_LABEL[user.status] || user.status}
            </Badge>
          </DetailItem>
          <DetailItem
            label="Login Microsoft"
            value={user.ssoRequired ? 'Obrigatório' : 'Opcional'}
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Contato">
        <DetailGrid columns={3}>
          <DetailItem label="E-mail" value={user.email} />
          <DetailItem label="Telefone" value={formatPhoneBr(user.phone || '')} />
          <DetailItem
            label="WhatsApp"
            value={user.whatsappUsername ? `@${user.whatsappUsername}` : ''}
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Endereço">
        <DetailGrid columns={1}>
          <DetailItem label="Endereço completo">
            {addressText ? (
              <span className="detail-item__multiline">{addressText}</span>
            ) : null}
          </DetailItem>
        </DetailGrid>
      </DetailSection>
    </DetailView>
  );
}
