export const mockProvider = {
    id: 'mock-test-provider',
    displayName: 'Mock provider (tests only)',
    capabilities: ['social_profile', 'mobile_app'],
    validateConfiguration: () => ({ configured: false, error: 'Mock data is disabled outside automated tests.' }),
    healthCheck: async () => ({
        providerId: 'mock-test-provider',
        displayName: 'Mock provider (tests only)',
        capabilities: ['social_profile', 'mobile_app'],
        status: 'disabled',
        configurationRequired: false,
        lastError: 'Not a production data source.',
    }),
    fetchRecords: async () => [],
};
