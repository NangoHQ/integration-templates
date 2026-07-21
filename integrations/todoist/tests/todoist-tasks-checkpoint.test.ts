import { afterEach, describe, expect, it, vi } from 'vitest';

import createSync from '../syncs/tasks.js';

describe('todoist tasks checkpoint tests', () => {
    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it('resumes from the saved cursor and clears the checkpoint after a full crawl', async () => {
        const nangoMock = new global.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'tasks',
            Model: 'Task'
        });

        const getCheckpointMock = nangoMock.getCheckpoint as unknown as { mockResolvedValue: (value: unknown) => void };
        getCheckpointMock.mockResolvedValue({ cursor: 'resume-cursor' });

        const paginateSpy = vi.spyOn(nangoMock, 'paginate').mockImplementation(async function* (config: any) {
            await config.paginate.on_page?.({ nextPageParam: 'next-cursor' });
            yield [{ id: 'task-1', content: 'Task 1', description: '', project_id: 'project-1', labels: [], priority: 1 }];

            await config.paginate.on_page?.({ nextPageParam: undefined });
            yield [{ id: 'task-2', content: 'Task 2', description: '', project_id: 'project-1', labels: [], priority: 1 }];
        });
        const saveCheckpointSpy = vi.spyOn(nangoMock, 'saveCheckpoint');
        const clearCheckpointSpy = vi.spyOn(nangoMock, 'clearCheckpoint');
        const trackDeletesEndSpy = vi.spyOn(nangoMock, 'trackDeletesEnd');

        await createSync.exec(nangoMock);

        expect(paginateSpy).toHaveBeenCalledTimes(1);
        expect(paginateSpy.mock.calls[0]?.[0]).toMatchObject({
            endpoint: '/api/v1/tasks',
            params: { cursor: 'resume-cursor' }
        });
        expect(saveCheckpointSpy).toHaveBeenCalledWith({ cursor: 'next-cursor' });
        expect(clearCheckpointSpy).toHaveBeenCalledTimes(1);
        expect(clearCheckpointSpy.mock.invocationCallOrder[0]).toBeLessThan(trackDeletesEndSpy.mock.invocationCallOrder[0]);
    });
});
