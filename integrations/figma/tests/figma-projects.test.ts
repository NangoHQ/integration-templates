import { afterEach, vi, expect, it, describe } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import createSync from '../syncs/projects.js';

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'projects.test.json'), 'utf8')) as {
    api: { get: Record<string, { response: unknown }> };
};
const recordedResponse = Object.values(fixture.api.get)[0]?.response;

describe('figma projects tests', () => {
    const models = 'Project'.split(',');

    const createTestContext = () => {
        const nangoMock = new global.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'projects',
            Model: 'Project'
        });
        // The preserved live fixture predates removal of the template's bogus
        // page_size parameter. Reuse that response without rewriting the JSON
        // snapshot when no live Figma connection is available for regeneration.
        vi.spyOn(nangoMock, 'get').mockResolvedValue({ data: recordedResponse } as never);

        return {
            nangoMock,
            batchSaveSpy: vi.spyOn(nangoMock, 'batchSave')
        };
    };

    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it('should get, map correctly the data and batchSave the result', async () => {
        const { nangoMock, batchSaveSpy } = createTestContext();

        await createSync.exec(nangoMock);

        for (const model of models) {
            const expectedBatchSaveData = await nangoMock.getBatchSaveData(model);

            const spiedData = batchSaveSpy.mock.calls.flatMap((call) => {
                if (call[1] === model) {
                    return call[0];
                }

                return [];
            });

            // Normalize spy-captured args into plain JSON so they compare cleanly
            // with fixture data loaded from `*.test.json`.
            // Removes things like prototypes, undefined values and other non-serializable data.
            const spied = JSON.parse(JSON.stringify(spiedData));

            expect(spied).toStrictEqual(expectedBatchSaveData);
        }
    });

    it('should get, map correctly the data and batchDelete the result', async () => {
        const { nangoMock } = createTestContext();
        const batchDeleteSpy = vi.spyOn(nangoMock, 'batchDelete');

        await createSync.exec(nangoMock);

        for (const model of models) {
            const batchDeleteData = await nangoMock.getBatchDeleteData(model);
            if (batchDeleteData && batchDeleteData.length > 0) {
                const spiedData = batchDeleteSpy.mock.calls.flatMap((call) => {
                    if (call[1] === model) {
                        return call[0];
                    }

                    return [];
                });

                // Normalize spy-captured args into plain JSON so they compare cleanly
                // with fixture data loaded from `*.test.json`.
                // Removes things like prototypes, undefined values and other non-serializable data.
                const spied = JSON.parse(JSON.stringify(spiedData));

                expect(spied).toStrictEqual(batchDeleteData);
            }
        }
    });
});
