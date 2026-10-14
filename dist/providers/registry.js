import { mockProvider } from './mock.provider.js';
import { appleAppStoreProvider } from './apple.provider.js';
import { blueskyProvider } from './bluesky.provider.js';
const adapters = [appleAppStoreProvider, blueskyProvider, mockProvider];
export async function providerStatuses() {
    return Promise.all(adapters.map((adapter) => adapter.healthCheck()));
}
