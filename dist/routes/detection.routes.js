import { Router } from 'express';
import mongoose from 'mongoose';
import { analysisRepository, serializeAnalysis } from '../repositories/analysis.repository.js';
import { brandRepository } from '../repositories/brand.repository.js';
import { analyzeCandidate } from '../services/detection.service.js';
import { configuredLLMProvider } from '../services/llm.provider.js';
import { CandidateValidationError, validateCandidateInput } from '../validation/detection.validation.js';
import { evidenceRepository } from '../repositories/evidence.repository.js';
import { assertEvidenceSafe, contentFingerprint, createUserEvidence, EvidenceValidationError } from '../validation/evidence.validation.js';
export async function analyzeAndPersist(brand, candidate, aiProvider, historyRepository, evidenceStore, evidenceFactory = createUserEvidence) {
    if (evidenceStore) {
        assertEvidenceSafe(candidate);
        const duplicate = await evidenceStore.findDuplicate(brand._id.toString(), contentFingerprint(brand._id.toString(), candidate));
        if (duplicate?.analysisId) {
            const existing = await historyRepository.findById(duplicate.analysisId);
            if (existing)
                return { ...serializeAnalysis(existing), duplicateEvidence: true };
        }
    }
    const analysis = await analyzeCandidate(brand, candidate, aiProvider);
    if (evidenceStore) {
        const evidence = evidenceFactory(analysis.brandId, candidate, analysis.analysisId);
        analysis.evidence = evidence;
        if (evidence.sourceType === 'authorized_api') {
            analysis.limitations = [
                ...analysis.limitations.filter((limitation) => !limitation.startsWith('No external providers were queried')),
                'Provider metadata was retrieved from an authorized API; catalog presence is not independent authenticity verification.',
            ];
        }
        await evidenceStore.create(evidence);
    }
    await historyRepository.create(analysis);
    return analysis;
}
export function createDetectionRouter(repository = brandRepository, aiProvider = configuredLLMProvider, historyRepository = analysisRepository, configuredEvidenceRepository) {
    const resolvedEvidenceRepository = configuredEvidenceRepository ?? (historyRepository === analysisRepository ? evidenceRepository : undefined);
    const router = Router();
    router.post('/analyze', async (request, response) => {
        try {
            const body = request.body;
            if (!body || typeof body !== 'object' || !mongoose.isValidObjectId(body.brandId)) {
                return response.status(400).json({ error: 'A valid brandId is required.' });
            }
            const brand = await repository.findById(String(body.brandId));
            if (!brand)
                return response.status(404).json({ error: 'Brand profile not found.' });
            const candidate = validateCandidateInput(body.candidate);
            const analysis = await analyzeAndPersist(brand, candidate, aiProvider, historyRepository, resolvedEvidenceRepository);
            return response.status(200).json({ analysis });
        }
        catch (error) {
            if (error instanceof CandidateValidationError)
                return response.status(400).json({ error: error.message, issues: error.issues });
            if (error instanceof EvidenceValidationError)
                return response.status(400).json({ error: error.message, issues: error.issues });
            console.error('[vikral-api] Detection request failed:', error);
            return response.status(503).json({ error: 'Detection analysis is unavailable.' });
        }
    });
    return router;
}
export default createDetectionRouter();
