import { IconDownload, IconEye, IconPaperclip } from '@tabler/icons-react';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/Button';
import {
  DetailGrid,
  DetailItem,
  DetailList,
  DetailListItem,
  DetailListSkeleton,
  DetailSection,
  DetailView,
} from '../ui/DetailView';
import { bankLabelByCode } from '../../lib/brazilianBanks';
import { formatPhoneBr, formatCpfCnpj, formatCep } from '../../lib/masks';
import {
  ACCOUNT_HOLDER_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
} from '../../lib/partyFinance';
import {
  PARTY_KIND_LABEL,
  PERSON_TYPE_LABEL,
  displayPartyName,
} from '../../lib/partyForm';
import { STATUS_LABEL, STATUS_TONE } from '../../lib/userForm';

function formatDateBr(iso) {
  const raw = String(iso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  const [year, month, day] = raw.split('-');
  return `${day}/${month}/${year}`;
}

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

function optionLabel(options, value) {
  return options.find((item) => item.value === value)?.label || '';
}

function billingContactsOf(party) {
  if (Array.isArray(party?.billingContacts) && party.billingContacts.length) {
    return party.billingContacts.filter((item) => item?.name || item?.email);
  }
  const name = String(party?.billingContactName || '').trim();
  const email = String(party?.billingEmail || '').trim();
  if (!name && !email) return [];
  return [{ name, email, emailActive: true }];
}

export function PartyDetailView({
  party,
  attachments = [],
  attachmentsLoading = false,
  onViewAttachment,
  onDownloadAttachment,
}) {
  if (!party) return null;

  const contacts = billingContactsOf(party);
  const addressText = formatAddress(party.address);
  const hasBank = Boolean(
    party.bankCode ||
      party.bankAgency ||
      party.bankAccount ||
      party.bankAccountType ||
      party.pixKey ||
      party.bankHolderKind ||
      party.bankHolderName,
  );

  return (
    <DetailView>
      <DetailSection title="Identificação">
        <DetailGrid columns={3}>
          <DetailItem label="Nome em exibição" value={displayPartyName(party)} />
          <DetailItem label="Documento" value={formatCpfCnpj(party.document)} />
          <DetailItem label="Status">
            <Badge tone={STATUS_TONE[party.status] || 'neutral'}>
              {STATUS_LABEL[party.status] || party.status}
            </Badge>
          </DetailItem>
          <DetailItem label="Tipo de cadastro" value={PARTY_KIND_LABEL[party.kind] || party.kind} />
          <DetailItem
            label="Tipo de pessoa"
            value={PERSON_TYPE_LABEL[party.personType] || party.personType}
          />
          {party.personType === 'PF' ? (
            <DetailItem label="Data de nascimento" value={formatDateBr(party.birthDate)} />
          ) : (
            <DetailItem label="Responsável" value={party.contactName} />
          )}
        </DetailGrid>
        {party.personType === 'PJ' ? (
          <DetailGrid>
            <DetailItem label="Razão social" value={party.legalName} />
            <DetailItem label="Nome fantasia" value={party.tradeName} />
          </DetailGrid>
        ) : (
          <DetailGrid columns={1}>
            <DetailItem label="Nome completo" value={party.legalName} />
          </DetailGrid>
        )}
      </DetailSection>

      <DetailSection title="Contato">
        <DetailGrid columns={3}>
          <DetailItem label="E-mail" value={party.email} />
          <DetailItem label="Telefone" value={formatPhoneBr(party.phone || '')} />
          <DetailItem
            label="WhatsApp"
            value={party.whatsappUsername ? `@${party.whatsappUsername}` : ''}
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

      <DetailSection title="Cobrança" description="Contatos que podem receber e-mails financeiros">
        {contacts.length ? (
          <DetailList>
            {contacts.map((contact, index) => (
              <DetailListItem
                key={`${contact.email || contact.name}-${index}`}
                title={contact.name || 'Sem nome'}
                meta={contact.email || 'Sem e-mail'}
                badge={
                  <Badge tone={contact.emailActive !== false ? 'ok' : 'neutral'}>
                    {contact.emailActive !== false ? 'Recebe cobrança' : 'Inativo'}
                  </Badge>
                }
              />
            ))}
          </DetailList>
        ) : (
          <DetailGrid columns={1}>
            <DetailItem label="Contatos" value="" />
          </DetailGrid>
        )}
      </DetailSection>

      <DetailSection title="Dados bancários">
        {hasBank ? (
          <DetailGrid>
            <DetailItem
              label="Banco"
              value={bankLabelByCode(party.bankCode)}
              full={!party.bankAgency}
            />
            <DetailItem label="Agência" value={party.bankAgency} />
            <DetailItem label="Conta" value={party.bankAccount} />
            <DetailItem
              label="Tipo de conta"
              value={optionLabel(ACCOUNT_TYPE_OPTIONS, party.bankAccountType)}
            />
            <DetailItem label="Chave Pix" value={party.pixKey} full />
            <DetailItem
              label="Titularidade"
              value={optionLabel(ACCOUNT_HOLDER_OPTIONS, party.bankHolderKind)}
            />
            <DetailItem label="Titular" value={party.bankHolderName} />
          </DetailGrid>
        ) : (
          <DetailGrid columns={1}>
            <DetailItem label="Conta" value="" />
          </DetailGrid>
        )}
      </DetailSection>

      <DetailSection title="Observações">
        <DetailGrid columns={1}>
          <DetailItem label="Anotações">
            {party.notes ? <span className="detail-item__multiline">{party.notes}</span> : null}
          </DetailItem>
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Anexos">
        {attachmentsLoading ? (
          <DetailListSkeleton active rows={2} />
        ) : attachments.length ? (
          <DetailList>
            {attachments.map((file) => (
              <DetailListItem
                key={file.id}
                title={file.originalName || file.name || 'Arquivo'}
                meta={file.contentType || file.mimeType || ''}
                badge={
                  onViewAttachment || onDownloadAttachment ? (
                    <div className="detail-list__actions">
                      {onViewAttachment ? (
                        <IconButton
                          type="button"
                          title="Ver"
                          aria-label="Ver anexo"
                          onClick={() => onViewAttachment(file)}
                        >
                          <IconEye size={16} stroke={1.75} />
                        </IconButton>
                      ) : null}
                      {onDownloadAttachment ? (
                        <IconButton
                          type="button"
                          title="Baixar"
                          aria-label="Baixar anexo"
                          onClick={() => onDownloadAttachment(file)}
                        >
                          <IconDownload size={16} stroke={1.75} />
                        </IconButton>
                      ) : null}
                    </div>
                  ) : (
                    <IconPaperclip size={16} stroke={1.75} aria-hidden />
                  )
                }
              />
            ))}
          </DetailList>
        ) : (
          <DetailGrid columns={1}>
            <DetailItem label="Arquivos" value="" />
          </DetailGrid>
        )}
      </DetailSection>
    </DetailView>
  );
}
