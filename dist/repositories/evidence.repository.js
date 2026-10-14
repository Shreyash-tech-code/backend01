import { randomUUID } from 'node:crypto';
import { EvidenceModel } from '../models/evidence.model.js';
export const evidenceRepository = {
    findDuplicate: (brandId, fingerprint) => EvidenceModel.findOne({ brandId, contentFingerprint: fingerprint }).exec(),
    create: (record) => EvidenceModel.create({ ...record, evidenceId: record.evidenceId || randomUUID(), collectedAt: new Date(record.collectedAt), observedAt: record.observedAt ? new Date(record.observedAt) : undefined, lastValidatedAt: new Date(record.lastValidatedAt) }),
};
