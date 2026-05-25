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

globalThis.vitest = {
    NangoActionMock,
    NangoSyncMock
};
