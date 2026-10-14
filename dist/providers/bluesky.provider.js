import { randomUUID } from 'node:crypto';
export const BLUESKY_API_URL = 'https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors';
const MAX_LIMIT = 10;
const MAX_RESPONSE_BYTES = 512 * 1024;
const REQUEST_TIMEOUT_MS = 5_000;
const MIN_REQUEST_INTERVAL_MS = 300;
export class BlueskyProviderError extends Error {
    statusCode;
    constructor(message, statusCode = 502) {
        super(message);
        this.statusCode = statusCode;
    }
}
export class BlueskyProvider {
    fetchImpl;
    now;
    id = 'bluesky-public-api';
    displayName = 'Bluesky public profiles';
    capabilities = ['social_profile'];
    lastRequestAt = 0;
    lastSuccessfulSync;
    lastError;
    lastStatus = 'connected';
    selections = new Map();
    constructor(fetchImpl = fetch, now = () => Date.now()) {
        this.fetchImpl = fetchImpl;
        this.now = now;
    }
    validateConfiguration() {
        return { configured: true };
    }
    async healthCheck() {
        return {
            providerId: this.id,
            displayName: this.displayName,
            capabilities: this.capabilities,
            status: this.lastStatus,
            configurationRequired: false,
            lastSuccessfulSync: this.lastSuccessfulSync,
            lastError: this.lastError,
        };
    }
    async fetchRecords() {
        return [];
    }
    async search(input) {
        const validated = validateBlueskySearchInput(input);
        const elapsed = this.now() - this.lastRequestAt;
        if (elapsed < MIN_REQUEST_INTERVAL_MS) {
            throw new BlueskyProviderError('Bluesky search is being rate limited locally. Retry shortly.', 429);
        }
        this.lastRequestAt = this.now();
        const url = new URL(BLUESKY_API_URL);
        url.searchParams.set('q', validated.query);
        url.searchParams.set('limit', String(validated.limit));
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await this.fetchImpl(url, { method: 'GET', signal: controller.signal, headers: { accept: 'application/json' } });
            if (response.status === 429)
                throw new BlueskyProviderError('Bluesky search rate limit reached. Retry shortly.', 429);
            if (!response.ok)
                throw new BlueskyProviderError('Bluesky public profile search returned an unavailable response.', 502);
            const contentLength = Number(response.headers.get('content-length') ?? 0);
            if (contentLength > MAX_RESPONSE_BYTES)
                throw new BlueskyProviderError('Bluesky response exceeded the permitted size.', 502);
            const buffer = await response.arrayBuffer();
            if (buffer.byteLength > MAX_RESPONSE_BYTES)
                throw new BlueskyProviderError('Bluesky response exceeded the permitted size.', 502);
            let payload;
            try {
                payload = JSON.parse(new TextDecoder().decode(buffer));
            }
            catch {
                throw new BlueskyProviderError('Bluesky returned malformed JSON.', 502);
            }
            if (!Array.isArray(payload.actors))
                throw new BlueskyProviderError('Bluesky returned an invalid search response.', 502);
            const profiles = payload.actors.map((actor) => normalizeBlueskyProfile(actor, this.now())).filter((profile) => profile !== undefined);
            this.lastSuccessfulSync = new Date(this.now()).toISOString();
            this.lastError = undefined;
            this.lastStatus = 'connected';
            for (const [key, value] of this.selections)
                if (value.expiresAt <= this.now())
                    this.selections.delete(key);
            profiles.forEach((profile) => this.selections.set(profile.selectionId, { profile, expiresAt: this.now() + 10 * 60 * 1000 }));
            return profiles;
        }
        catch (error) {
            if (error instanceof BlueskyProviderError) {
                this.lastError = error.message;
                this.lastStatus = error.statusCode === 429 ? 'unavailable' : 'error';
                throw error;
            }
            this.lastError = error instanceof Error && error.name === 'AbortError' ? 'Bluesky public API request timed out.' : 'Bluesky public API request failed.';
            this.lastStatus = 'unavailable';
            throw new BlueskyProviderError(this.lastError, 504);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    getSelection(selectionId) {
        const selection = this.selections.get(selectionId);
        if (!selection || selection.expiresAt <= this.now()) {
            this.selections.delete(selectionId);
            return undefined;
        }
        return selection.profile;
    }
}
export function validateBlueskySearchInput(input) {
    if (!input || typeof input.query !== 'string' || !input.query.trim() || input.query.trim().length > 100)
        throw new BlueskyProviderError('query must be between 1 and 100 characters.', 400);
    if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > MAX_LIMIT)
        throw new BlueskyProviderError(`limit must be between 1 and ${MAX_LIMIT}.`, 400);
    return { query: input.query.trim(), limit: input.limit };
}
function normalizeBlueskyProfile(actor, now) {
    if (typeof actor.did !== 'string' || typeof actor.handle !== 'string' || !actor.did || !actor.handle)
        return undefined;
    const handle = actor.handle.trim();
    if (!handle || handle === 'handle.invalid')
        return undefined;
    return {
        selectionId: randomUUID(),
        providerRecordId: actor.did,
        did: actor.did,
        handle,
        displayName: typeof actor.displayName === 'string' ? actor.displayName.trim() || undefined : undefined,
        description: typeof actor.description === 'string' ? actor.description.trim() || undefined : undefined,
        avatarUrl: typeof actor.avatar === 'string' ? actor.avatar : undefined,
        indexedAt: typeof actor.indexedAt === 'string' ? actor.indexedAt : undefined,
        profileUrl: `https://bsky.app/profile/${encodeURIComponent(handle)}`,
        platform: 'Bluesky',
        collectionTime: new Date(now).toISOString(),
        sourceProvider: 'bluesky_public_api',
    };
}
export const blueskyProvider = new BlueskyProvider();
