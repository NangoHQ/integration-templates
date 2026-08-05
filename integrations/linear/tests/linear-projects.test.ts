import { afterEach, vi, expect, it, describe } from 'vitest';

import createSync from '../syncs/projects.js';

describe('linear projects tests', () => {
    const models = 'Project'.split(',');

    const createTestContext = () => {
        const nangoMock = new global.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'projects',
            Model: 'Project'
        });

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

    it('should not open or close delete tracking when the first page fails', async () => {
        const { nangoMock } = createTestContext();
        const trackDeletesStartSpy = vi.spyOn(nangoMock, 'trackDeletesStart');
        const trackDeletesEndSpy = vi.spyOn(nangoMock, 'trackDeletesEnd');

        vi.spyOn(nangoMock, 'post').mockRejectedValue(new Error('Linear request failed'));

        await expect(createSync.exec(nangoMock)).rejects.toThrow('Linear request failed');

        expect(trackDeletesStartSpy).not.toHaveBeenCalled();
        expect(trackDeletesEndSpy).not.toHaveBeenCalled();
    });

    it('should track deletes only after a page has been validated', async () => {
        const { nangoMock } = createTestContext();
        const trackDeletesStartSpy = vi.spyOn(nangoMock, 'trackDeletesStart');
        const trackDeletesEndSpy = vi.spyOn(nangoMock, 'trackDeletesEnd');

        await createSync.exec(nangoMock);

        expect(trackDeletesStartSpy).toHaveBeenCalledTimes(1);
        expect(trackDeletesEndSpy).toHaveBeenCalledTimes(1);
    });

    it('should fail rather than truncate when hasNextPage is true without an endCursor', async () => {
        const { nangoMock, batchSaveSpy } = createTestContext();
        const trackDeletesStartSpy = vi.spyOn(nangoMock, 'trackDeletesStart');
        const trackDeletesEndSpy = vi.spyOn(nangoMock, 'trackDeletesEnd');

        vi.spyOn(nangoMock, 'post').mockResolvedValue({
            data: {
                data: {
                    projects: {
                        nodes: [
                            {
                                id: 'project-1',
                                name: 'Project 1',
                                status: null,
                                lead: null,
                                createdAt: '2026-08-04T12:02:58.691Z',
                                updatedAt: '2026-08-04T12:02:58.691Z'
                            }
                        ],
                        pageInfo: { hasNextPage: true, endCursor: null }
                    }
                }
            }
        });

        await expect(createSync.exec(nangoMock)).rejects.toThrow('Inconsistent Linear pagination state');

        // The pagination-consistency check must run before delete tracking is opened and before any records
        // are saved, otherwise a malformed first page leaves tracking open against a partial project set.
        expect(trackDeletesStartSpy).not.toHaveBeenCalled();
        expect(batchSaveSpy).not.toHaveBeenCalled();
        expect(trackDeletesEndSpy).not.toHaveBeenCalled();
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
