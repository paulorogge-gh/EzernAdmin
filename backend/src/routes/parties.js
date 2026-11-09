import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { Op } from 'sequelize';
import { env } from '../config/env.js';
import {
  isValidCpfOrCnpj,
  onlyDigits,
  personTypeFromDocument,
} from '../lib/brazilianDocument.js';
import {
  legacyBillingFromContacts,
  normalizeBillingContacts,
  validateBillingContacts,
} from '../lib/billingContacts.js';
import { applyAddressToParty, validatePartyAddress } from '../lib/partyAddress.js';
import {
  MAX_FILE_SIZE,
  MAX_FILES_PER_UPLOAD,
  detectSafeType,
  partyAttachmentBlobPath,
  sanitizeOriginalName,
} from '../lib/safeFile.js';
import { requireAuth, requireRole, loadUser } from '../middleware/auth.js';
import { Party, PartyAttachment } from '../models/index.js';
import { deleteBlob, downloadBlob, uploadBlob } from '../services/blob.js';

export const partiesRouter = Router();

partiesRouter.use(requireAuth, loadUser, requireRole('OWNER', 'ADMIN'));

const uploadAttachments = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES_PER_UPLOAD },
});

function blobConfigured(res) {
  if (env.blob.connectionString) return true;
  res.status(503).json({ error: { message: 'Armazenamento de arquivos não configurado' } });
  return false;
}

async function findOrgParty(organizationId, partyId) {
  return Party.findOne({
    where: { id: partyId, organizationId },
  });
}

function resolveKindFlags(kind, body) {
  if (kind === 'CUSTOMER') return { isCustomer: true, isSupplier: false };
  if (kind === 'SUPPLIER') return { isCustomer: false, isSupplier: true };
  if (kind === 'BOTH') return { isCustomer: true, isSupplier: true };
  if (body?.isCustomer !== undefined || body?.isSupplier !== undefined) {
    return {
      isCustomer: Boolean(body.isCustomer),
      isSupplier: Boolean(body.isSupplier),
    };
  }
  return null;
}

function parsePartyPayload(body, { partial = false } = {}) {
  const document = onlyDigits(body?.document);
  const personType =
    personTypeFromDocument(document) ||
    (['PF', 'PJ'].includes(String(body?.personType || '').toUpperCase())
      ? String(body.personType).toUpperCase()
      : null);

  const kindFlags = resolveKindFlags(String(body?.kind || '').toUpperCase(), body);

  const accountType = String(body?.bankAccountType || '').toUpperCase();
  const holderKind = String(body?.bankHolderKind || '').toUpperCase();
  const birthDateRaw = body?.birthDate ? String(body.birthDate).trim() : '';

  const payload = {
    document,
    personType,
    legalName: String(body?.legalName || '').trim(),
    tradeName: String(body?.tradeName || '').trim() || null,
    contactName: String(body?.contactName || '').trim() || null,
    birthDate: birthDateRaw || null,
    email: String(body?.email || '')
      .trim()
      .toLowerCase() || null,
    phone: String(body?.phone || '').trim() || null,
    whatsappUsername: String(body?.whatsappUsername || '')
      .trim()
      .replace(/^@+/, '') || null,
    notes: String(body?.notes || '').trim() || null,
    status: body?.status ? String(body.status).toUpperCase() : undefined,
    address: body?.address,
    billingContacts: normalizeBillingContacts(body?.billingContacts, {
      legacyName: body?.billingContactName,
      legacyEmail: body?.billingEmail,
    }),
    bankCode: String(body?.bankCode || '').trim() || null,
    bankAgency: String(body?.bankAgency || '').trim() || null,
    bankAccount: String(body?.bankAccount || '').trim() || null,
    bankAccountType: ['CHECKING', 'SAVINGS'].includes(accountType) ? accountType : null,
    pixKey: String(body?.pixKey || '').trim() || null,
    bankHolderKind: ['OWN', 'OTHER'].includes(holderKind) ? holderKind : null,
    bankHolderName: String(body?.bankHolderName || '').trim() || null,
    kindFlags,
  };

  if (!partial) {
    if (!payload.document || !isValidCpfOrCnpj(payload.document)) {
      return { ok: false, message: 'CPF ou CNPJ inválido' };
    }
    if (!payload.personType) {
      return { ok: false, message: 'Não foi possível identificar PF ou PJ' };
    }
    if (payload.personType === 'PF' && payload.document.length !== 11) {
      return { ok: false, message: 'CPF inválido' };
    }
    if (payload.personType === 'PJ' && payload.document.length !== 14) {
      return { ok: false, message: 'CNPJ inválido' };
    }
    if (!payload.legalName) {
      return { ok: false, message: 'Nome / razão social é obrigatório' };
    }
    if (!payload.kindFlags || (!payload.kindFlags.isCustomer && !payload.kindFlags.isSupplier)) {
      return { ok: false, message: 'Selecione cliente, fornecedor ou ambos' };
    }
  } else if (payload.document) {
    if (!isValidCpfOrCnpj(payload.document)) {
      return { ok: false, message: 'CPF ou CNPJ inválido' };
    }
    payload.personType = personTypeFromDocument(payload.document);
  }

  if (payload.status && !['ACTIVE', 'DISABLED'].includes(payload.status)) {
    return { ok: false, message: 'Status inválido' };
  }

  if (payload.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(payload.birthDate)) {
    return { ok: false, message: 'Data de nascimento inválida' };
  }
  if (payload.personType === 'PJ') {
    payload.birthDate = null;
  }
  if (payload.bankHolderKind === 'OWN' && payload.legalName) {
    payload.bankHolderName = payload.legalName;
  }
  if (payload.bankHolderKind === 'OTHER' && !payload.bankHolderName) {
    return { ok: false, message: 'Informe o nome do titular da conta' };
  }
  const billingCheck = validateBillingContacts(payload.billingContacts);
  if (!billingCheck.ok) return billingCheck;

  const legacyBilling = legacyBillingFromContacts(payload.billingContacts);
  payload.billingContactName = legacyBilling.billingContactName;
  payload.billingEmail = legacyBilling.billingEmail;

  if (payload.address !== undefined) {
    const check = validatePartyAddress(payload.address, { required: false });
    if (!check.ok) return check;
    payload.addressNormalized = check.address;
  }

  return { ok: true, payload };
}

function financeFieldsFromPayload(payload) {
  return {
    billingContacts: payload.billingContacts,
    billingContactName: payload.billingContactName,
    billingEmail: payload.billingEmail,
    bankCode: payload.bankCode,
    bankAgency: payload.bankAgency,
    bankAccount: payload.bankAccount,
    bankAccountType: payload.bankAccountType,
    pixKey: payload.pixKey,
    bankHolderKind: payload.bankHolderKind,
    bankHolderName: payload.bankHolderName,
  };
}

partiesRouter.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const kind = String(req.query.kind || '').toUpperCase();
    const status = String(req.query.status || '').toUpperCase();

    const where = { organizationId: req.auth.organizationId };
    if (status === 'ACTIVE' || status === 'DISABLED') where.status = status;
    if (kind === 'CUSTOMER') where.isCustomer = true;
    if (kind === 'SUPPLIER') where.isSupplier = true;
    if (kind === 'BOTH') {
      where.isCustomer = true;
      where.isSupplier = true;
    }
    if (q) {
      const digits = onlyDigits(q);
      where[Op.or] = [
        { legalName: { [Op.like]: `%${q}%` } },
        { tradeName: { [Op.like]: `%${q}%` } },
        { email: { [Op.like]: `%${q}%` } },
        ...(digits ? [{ document: { [Op.like]: `%${digits}%` } }] : []),
      ];
    }

    const rows = await Party.findAll({
      where,
      order: [['legalName', 'ASC']],
    });
    return res.json({ data: rows.map((row) => row.toSafeJSON()) });
  } catch (err) {
    return next(err);
  }
});

partiesRouter.post('/', async (req, res, next) => {
  try {
    const parsed = parsePartyPayload(req.body, { partial: false });
    if (!parsed.ok) {
      return res.status(400).json({ error: { message: parsed.message } });
    }
    const { payload } = parsed;

    const exists = await Party.findOne({
      where: {
        organizationId: req.auth.organizationId,
        document: payload.document,
      },
    });
    if (exists) {
      return res.status(409).json({ error: { message: 'Já existe cadastro com este CPF/CNPJ' } });
    }

    const party = await Party.create({
      organizationId: req.auth.organizationId,
      personType: payload.personType,
      document: payload.document,
      legalName: payload.legalName,
      tradeName: payload.personType === 'PJ' ? payload.tradeName : null,
      contactName: payload.contactName,
      birthDate: payload.personType === 'PF' ? payload.birthDate : null,
      email: payload.email,
      phone: payload.phone,
      whatsappUsername: payload.whatsappUsername,
      isCustomer: payload.kindFlags.isCustomer,
      isSupplier: payload.kindFlags.isSupplier,
      status: payload.status || 'ACTIVE',
      notes: payload.notes,
      ...financeFieldsFromPayload(payload),
      ...(payload.addressNormalized
        ? Object.fromEntries(
            Object.entries({
              addressStreet: payload.addressNormalized.street || null,
              addressNumber: payload.addressNormalized.number || null,
              addressComplement: payload.addressNormalized.complement || null,
              addressNeighborhood: payload.addressNormalized.neighborhood || null,
              addressDistrict: payload.addressNormalized.district || null,
              addressCity: payload.addressNormalized.city || null,
              addressState: payload.addressNormalized.state || null,
              addressCountry: payload.addressNormalized.country || null,
              addressZip: payload.addressNormalized.zip || null,
              addressPlaceId: payload.addressNormalized.placeId || null,
              addressFormatted: payload.addressNormalized.formatted || null,
            }),
          )
        : {}),
    });

    return res.status(201).json({ data: party.toSafeJSON() });
  } catch (err) {
    return next(err);
  }
});

partiesRouter.patch('/:id', async (req, res, next) => {
  try {
    const party = await Party.findOne({
      where: { id: req.params.id, organizationId: req.auth.organizationId },
    });
    if (!party) {
      return res.status(404).json({ error: { message: 'Cadastro não encontrado' } });
    }

    const parsed = parsePartyPayload(req.body, { partial: true });
    if (!parsed.ok) {
      return res.status(400).json({ error: { message: parsed.message } });
    }
    const { payload } = parsed;

    if (payload.document && payload.document !== party.document) {
      const exists = await Party.findOne({
        where: {
          organizationId: req.auth.organizationId,
          document: payload.document,
          id: { [Op.ne]: party.id },
        },
      });
      if (exists) {
        return res.status(409).json({ error: { message: 'Já existe cadastro com este CPF/CNPJ' } });
      }
      party.document = payload.document;
      party.personType = payload.personType;
    }

    if (req.body?.legalName !== undefined) {
      if (!payload.legalName) {
        return res.status(400).json({ error: { message: 'Nome / razão social é obrigatório' } });
      }
      party.legalName = payload.legalName;
    }
    if (req.body?.tradeName !== undefined) {
      party.tradeName = party.personType === 'PJ' ? payload.tradeName : null;
    }
    if (req.body?.contactName !== undefined) party.contactName = payload.contactName;
    if (req.body?.birthDate !== undefined) {
      party.birthDate = party.personType === 'PF' ? payload.birthDate : null;
    }
    if (req.body?.email !== undefined) party.email = payload.email;
    if (req.body?.phone !== undefined) party.phone = payload.phone;
    if (req.body?.whatsappUsername !== undefined) {
      party.whatsappUsername = payload.whatsappUsername;
    }
    if (req.body?.notes !== undefined) party.notes = payload.notes;
    if (
      req.body?.billingContacts !== undefined ||
      req.body?.billingContactName !== undefined ||
      req.body?.billingEmail !== undefined
    ) {
      party.billingContacts = payload.billingContacts;
      party.billingContactName = payload.billingContactName;
      party.billingEmail = payload.billingEmail;
    }
    if (req.body?.bankCode !== undefined) party.bankCode = payload.bankCode;
    if (req.body?.bankAgency !== undefined) party.bankAgency = payload.bankAgency;
    if (req.body?.bankAccount !== undefined) party.bankAccount = payload.bankAccount;
    if (req.body?.bankAccountType !== undefined) {
      party.bankAccountType = payload.bankAccountType;
    }
    if (req.body?.pixKey !== undefined) party.pixKey = payload.pixKey;
    if (req.body?.bankHolderKind !== undefined) party.bankHolderKind = payload.bankHolderKind;
    if (req.body?.bankHolderName !== undefined || req.body?.bankHolderKind !== undefined) {
      party.bankHolderName =
        party.bankHolderKind === 'OWN' ? party.legalName : payload.bankHolderName;
    }
    if (payload.status) party.status = payload.status;
    if (payload.kindFlags) {
      if (!payload.kindFlags.isCustomer && !payload.kindFlags.isSupplier) {
        return res.status(400).json({ error: { message: 'Selecione cliente, fornecedor ou ambos' } });
      }
      party.isCustomer = payload.kindFlags.isCustomer;
      party.isSupplier = payload.kindFlags.isSupplier;
    }
    if (payload.addressNormalized) {
      applyAddressToParty(party, payload.addressNormalized);
    }

    await party.save();
    return res.json({ data: party.toSafeJSON() });
  } catch (err) {
    return next(err);
  }
});

partiesRouter.get('/:id/f', async (req, res, next) => {
  try {
    const party = await findOrgParty(req.auth.organizationId, req.params.id);
    if (!party) {
      return res.status(404).json({ error: { message: 'Cadastro não encontrado' } });
    }

    const rows = await PartyAttachment.findAll({
      where: {
        organizationId: req.auth.organizationId,
        partyId: party.id,
      },
      order: [['createdAt', 'DESC']],
    });
    return res.json({ data: rows.map((row) => row.toSafeJSON()) });
  } catch (err) {
    return next(err);
  }
});

partiesRouter.post(
  '/:id/f',
  uploadAttachments.array('files', MAX_FILES_PER_UPLOAD),
  async (req, res, next) => {
    try {
      if (!blobConfigured(res)) return undefined;

      const party = await findOrgParty(req.auth.organizationId, req.params.id);
      if (!party) {
        return res.status(404).json({ error: { message: 'Cadastro não encontrado' } });
      }

      const files = Array.isArray(req.files) ? req.files : [];
      if (!files.length) {
        return res.status(400).json({ error: { message: 'Selecione ao menos um arquivo' } });
      }

      const created = [];
      for (const file of files) {
        const check = await detectSafeType(file.buffer, file.mimetype);
        if (!check.ok) {
          return res.status(400).json({
            error: { message: `${sanitizeOriginalName(file.originalname)}: ${check.message}` },
          });
        }

        const attachmentId = randomUUID();
        const blobName = partyAttachmentBlobPath(
          req.auth.organizationId,
          party.id,
          attachmentId,
          check.ext,
        );

        await uploadBlob(blobName, file.buffer, check.mime);

        try {
          const row = await PartyAttachment.create({
            id: attachmentId,
            organizationId: req.auth.organizationId,
            partyId: party.id,
            blobName,
            originalName: sanitizeOriginalName(file.originalname),
            contentType: check.mime,
            sizeBytes: file.size,
            uploadedBy: req.auth.userId || null,
          });
          created.push(row.toSafeJSON());
        } catch (err) {
          await deleteBlob(blobName).catch(() => undefined);
          throw err;
        }
      }

      return res.status(201).json({ data: created });
    } catch (err) {
      return next(err);
    }
  },
);

partiesRouter.get('/:id/f/:fid/y', async (req, res, next) => {
  try {
    if (!blobConfigured(res)) return undefined;

    const attachment = await PartyAttachment.findOne({
      where: {
        id: req.params.fid,
        partyId: req.params.id,
        organizationId: req.auth.organizationId,
      },
    });
    if (!attachment) {
      return res.status(404).json({ error: { message: 'Arquivo não encontrado' } });
    }

    const file = await downloadBlob(attachment.blobName);
    const safeName = sanitizeOriginalName(attachment.originalName).replace(/"/g, '');
    res.setHeader('Content-Type', attachment.contentType || file.contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    );
    return res.send(file.buffer);
  } catch (err) {
    return next(err);
  }
});

partiesRouter.delete('/:id/f/:fid', async (req, res, next) => {
  try {
    const attachment = await PartyAttachment.findOne({
      where: {
        id: req.params.fid,
        partyId: req.params.id,
        organizationId: req.auth.organizationId,
      },
    });
    if (!attachment) {
      return res.status(404).json({ error: { message: 'Arquivo não encontrado' } });
    }

    const blobName = attachment.blobName;
    await attachment.destroy();
    if (env.blob.connectionString) {
      await deleteBlob(blobName).catch(() => undefined);
    }
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});
