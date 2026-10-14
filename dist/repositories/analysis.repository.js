import { AnalysisModel } from '../models/analysis.model.js';
export const analysisRepository = {
    list: () => AnalysisModel.find().sort({ analyzedAt: -1 }).limit(50).exec(),
    findById: (id) => AnalysisModel.findOne({ analysisId: id }).exec(),
    create: (result) => AnalysisModel.create({
        analysisId: result.analysisId,
        brandId: result.brandId,
        brandName: result.matchedBrand.name,
        candidate: result.candidate,
        result,
        analyzedAt: new Date(result.analyzedAt),
    }),
};
export function serializeAnalysis(analysis) {
    return analysis.result;
}
