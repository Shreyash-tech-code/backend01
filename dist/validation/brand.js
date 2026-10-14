import { APP_PLATFORMS, SOCIAL_PLATFORMS, VERIFICATION_STATUSES, } from '../types/brand.js';
const MAX = { name: 120, industry: 100, description: 2000, alias: 120, domain: 253, handle: 120, note: 500 };
const httpUrl = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const domain = /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const packageId = /^[a-zA-Z][\w]*(?:\.[a-zA-Z][\w]*)+$/;
export class ValidationError extends Error {
    issues;
    constructor(issues) {
        super('Brand profile validation failed.');
        this.issues = issues;
    }
}
const text = (value, field, max, required = false) => {
    if (typeof value !== 'string') {
        if (!required && (value === undefined || value === null))
            return undefined;
        throw new ValidationError([`${field} must be a string.`]);
    }
    const normalized = value.trim();
    if (required && !normalized)
        throw new ValidationError([`${field} is required.`]);
    if (normalized.length > max)
        throw new ValidationError([`${field} must be ${max} characters or fewer.`]);
    return normalized || undefined;
};
const url = (value, field) => {
    const normalized = text(value, field, 2048);
    if (normalized && !httpUrl.test(normalized))
        throw new ValidationError([`${field} must be a valid HTTP or HTTPS URL.`]);
    return normalized;
};
const stringArray = (value, field, max, normalize) => {
    if (!Array.isArray(value))
        throw new ValidationError([`${field} must be an array.`]);
    const values = value.map((item) => text(item, field, max, true)).map((item) => normalize(item));
    if (values.some((item) => !item))
        throw new ValidationError([`${field} cannot contain empty values.`]);
    return [...new Set(values)];
};
const social = (value) => {
    if (!value || typeof value !== 'object')
        throw new ValidationError(['Each social account must be an object.']);
    const item = value;
    if (!SOCIAL_PLATFORMS.includes(item.platform))
        throw new ValidationError(['socialAccounts contains an unsupported platform.']);
    const verificationStatus = item.verificationStatus ?? 'unverified';
    if (!VERIFICATION_STATUSES.includes(verificationStatus))
        throw new ValidationError(['Social verification status is invalid.']);
    return {
        platform: item.platform,
        handle: text(item.handle, 'Social handle', MAX.handle, true).replace(/^@+/, '@'),
        profileUrl: url(item.profileUrl, 'Social profile URL'),
        verificationStatus: verificationStatus,
        evidenceNote: text(item.evidenceNote, 'Social evidence note', MAX.note),
    };
};
const mobileApp = (value) => {
    if (!value || typeof value !== 'object')
        throw new ValidationError(['Each mobile app must be an object.']);
    const item = value;
    if (!APP_PLATFORMS.includes(item.platform))
        throw new ValidationError(['mobileApps contains an unsupported platform.']);
    const verificationStatus = item.verificationStatus ?? 'unverified';
    if (!VERIFICATION_STATUSES.includes(verificationStatus))
        throw new ValidationError(['App verification status is invalid.']);
    const normalizedPackage = text(item.packageId, 'Package ID', 160);
    if (normalizedPackage && !packageId.test(normalizedPackage))
        throw new ValidationError(['Package ID is invalid.']);
    return {
        platform: item.platform,
        appName: text(item.appName, 'App name', MAX.name, true),
        packageId: normalizedPackage,
        bundleId: text(item.bundleId, 'Bundle ID', 160),
        publisher: text(item.publisher, 'Publisher', MAX.name, true),
        storeUrl: url(item.storeUrl, 'Store URL'),
        verificationStatus: verificationStatus,
        evidenceNote: text(item.evidenceNote, 'App evidence note', MAX.note),
    };
};
export function validateBrandInput(input) {
    if (!input || typeof input !== 'object')
        throw new ValidationError(['Request body must be an object.']);
    const body = input;
    const normalized = {
        name: text(body.name, 'Brand name', MAX.name, true),
        officialWebsite: url(body.officialWebsite, 'Official website'),
        industry: text(body.industry, 'Industry', MAX.industry),
        description: text(body.description, 'Description', MAX.description),
        logoUrl: url(body.logoUrl, 'Logo URL'),
        aliases: stringArray(body.aliases ?? [], 'Aliases', MAX.alias, (value) => value),
        trustedDomains: stringArray(body.trustedDomains ?? [], 'Trusted domains', MAX.domain, (value) => value.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '')),
        socialAccounts: Array.isArray(body.socialAccounts) ? body.socialAccounts.map(social) : (() => { throw new ValidationError(['socialAccounts must be an array.']); })(),
        mobileApps: Array.isArray(body.mobileApps) ? body.mobileApps.map(mobileApp) : (() => { throw new ValidationError(['mobileApps must be an array.']); })(),
    };
    normalized.trustedDomains.forEach((item) => {
        if (!domain.test(item))
            throw new ValidationError([`Trusted domain "${item}" is invalid.`]);
    });
    return normalized;
}
