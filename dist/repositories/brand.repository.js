import { BrandModel } from '../models/brand.model.js';
export const brandRepository = {
    list: () => BrandModel.find().sort({ createdAt: -1 }).exec(),
    findById: (id) => BrandModel.findById(id).exec(),
    create: (input) => BrandModel.create(input),
    update: (id, input) => BrandModel.findByIdAndUpdate(id, input, { new: true, runValidators: true }).exec(),
    delete: async (id) => Boolean(await BrandModel.findByIdAndDelete(id).exec()),
};
export function serializeBrand(brand) {
    return {
        id: brand._id.toString(),
        name: brand.name,
        officialWebsite: brand.officialWebsite,
        industry: brand.industry,
        description: brand.description,
        logoUrl: brand.logoUrl,
        aliases: brand.aliases,
        trustedDomains: brand.trustedDomains,
        socialAccounts: brand.socialAccounts,
        mobileApps: brand.mobileApps,
        createdAt: brand.createdAt.toISOString(),
        updatedAt: brand.updatedAt.toISOString(),
    };
}
