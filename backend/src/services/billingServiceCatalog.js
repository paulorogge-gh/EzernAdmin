import { BillingService } from '../models/BillingService.js';
import { ensureOrganizationProfile } from './organizationProfileService.js';

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function normalizeAnexo(value) {
  const anexo = String(value || 'V').toUpperCase();
  if (!['III', 'V', 'I', 'II', 'IV'].includes(anexo)) {
    throw httpError('Anexo do Simples inválido');
  }
  return anexo;
}

export async function listBillingServices(organizationId, { status } = {}) {
  const where = { organizationId };
  if (status) where.status = status;
  const rows = await BillingService.findAll({
    where,
    order: [['name', 'ASC']],
  });
  return rows.map((row) => row.toSafeJSON());
}

export async function getBillingService(organizationId, id) {
  const row = await BillingService.findOne({ where: { id, organizationId } });
  if (!row) throw httpError('Serviço não encontrado', 404);
  return row.toSafeJSON();
}

export async function createBillingService(organizationId, body = {}) {
  await ensureOrganizationProfile(organizationId);
  const name = String(body.name || '').trim();
  if (!name) throw httpError('Informe o nome do serviço');
  const unitPrice = Number(body.unitPrice ?? 0);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) throw httpError('Preço inválido');

  const row = await BillingService.create({
    organizationId,
    name,
    description: String(body.description || '').trim() || null,
    nfDescription:
      String(body.nfDescription || '').trim() || 'Serviços de suporte técnico',
    unitPrice,
    status: body.status === 'inativo' ? 'inativo' : 'ativo',
    cnae: String(body.cnae || '').replace(/\D/g, '') || null,
    municipalServiceId: body.municipalServiceId || null,
    municipalServiceCode: body.municipalServiceCode || null,
    municipalServiceName: body.municipalServiceName || null,
    taxes: body.taxes || null,
    simplesAnexo: normalizeAnexo(body.simplesAnexo),
    fatorREligible: body.fatorREligible !== false,
    issRetained: Boolean(body.issRetained),
  });
  return row.toSafeJSON();
}

export async function updateBillingService(organizationId, id, body = {}) {
  const row = await BillingService.findOne({ where: { id, organizationId } });
  if (!row) throw httpError('Serviço não encontrado', 404);

  if (body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name) throw httpError('Informe o nome do serviço');
    row.name = name;
  }
  if (body.description !== undefined) {
    row.description = String(body.description || '').trim() || null;
  }
  if (body.nfDescription !== undefined) {
    row.nfDescription = String(body.nfDescription || '').trim() || null;
  }
  if (body.unitPrice !== undefined) {
    const unitPrice = Number(body.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw httpError('Preço inválido');
    row.unitPrice = unitPrice;
  }
  if (body.status !== undefined) {
    row.status = body.status === 'inativo' ? 'inativo' : 'ativo';
  }
  if (body.cnae !== undefined) row.cnae = String(body.cnae || '').replace(/\D/g, '') || null;
  if (body.municipalServiceId !== undefined) {
    row.municipalServiceId = body.municipalServiceId || null;
  }
  if (body.municipalServiceCode !== undefined) {
    row.municipalServiceCode = body.municipalServiceCode || null;
  }
  if (body.municipalServiceName !== undefined) {
    row.municipalServiceName = body.municipalServiceName || null;
  }
  if (body.taxes !== undefined) row.taxes = body.taxes || null;
  if (body.simplesAnexo !== undefined) row.simplesAnexo = normalizeAnexo(body.simplesAnexo);
  if (body.fatorREligible !== undefined) row.fatorREligible = Boolean(body.fatorREligible);
  if (body.issRetained !== undefined) row.issRetained = Boolean(body.issRetained);

  await row.save();
  return row.toSafeJSON();
}
