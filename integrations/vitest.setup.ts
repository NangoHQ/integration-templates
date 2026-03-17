import { getProviders, updateProviderCache } from '@nangohq/providers';
import { vi } from 'vitest';
import { NangoActionMock, NangoSyncMock as BaseNangoSyncMock } from 'nango/test';

class NangoSyncMock extends BaseNangoSyncMock {
    constructor(config: ConstructorParameters<typeof BaseNangoSyncMock>[0]) {
        super(config);
        this.getCheckpoint = vi.fn(async () => undefined);
        this.saveCheckpoint = vi.fn(async () => undefined);
        this.clearCheckpoint = vi.fn(() => undefined);
    }
}

const providerAliases = {
    'hubspot-knnj': 'hubspot',
    'slack-crmk': 'slack'
};

const providers = getProviders();
if (providers) {
    let updated = false;
    for (const [alias, providerKey] of Object.entries(providerAliases)) {
        const provider = providers[providerKey];
        if (provider && !providers[alias]) {
            providers[alias] = provider;
            updated = true;
        }
    }
    if (updated) {
        updateProviderCache(providers);
    }
}

globalThis.vitest = {
    NangoActionMock,
    NangoSyncMock
};
