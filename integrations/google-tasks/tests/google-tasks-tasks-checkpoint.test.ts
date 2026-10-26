import { afterEach, describe, expect, it, vi } from 'vitest';

import createSync from '../syncs/tasks.js';

const LIST_A = 'list-a';
const LIST_B = 'list-b';
const LIST_GONE = 'list-gone';

const task = (id: string, updated: string, extra: Record<string, unknown> = {}) => ({
    kind: 'tasks#task',
    id,
    title: `Task ${id}`,
    status: 'needsAction',
    updated,
    ...extra
});

type PaginateConfig = { endpoint: string; params?: Record<string, string> };

function createContext(checkpoint: Record<string, string> | null, pages: Record<string, unknown[] | 'not_found'>, tasklistIds: string[]) {
    const nangoMock = new global.vitest.NangoSyncMock({
        dirname: __dirname,
        name: 'tasks',
        Model: 'Task'
    });

    const getCheckpointMock = nangoMock.getCheckpoint as unknown as { mockResolvedValue: (value: unknown) => void };
    getCheckpointMock.mockResolvedValue(checkpoint);

    const paginateSpy = vi.spyOn(nangoMock, 'paginate').mockImplementation(async function* (config: PaginateConfig) {
        if (config.endpoint === '/tasks/v1/users/@me/lists') {
            yield tasklistIds.map((id) => ({ kind: 'tasks#taskList', id, title: id }));
            return;
        }
        const listId = decodeURIComponent(config.endpoint.split('/')[4] ?? '');
        const result = pages[listId];
        if (result === 'not_found') {
            throw Object.assign(new Error('Task list not found.'), { response: { status: 404 } });
        }
        yield result ?? [];
    } as never);

    return {
        nangoMock,
        paginateSpy,
        batchSaveSpy: vi.spyOn(nangoMock, 'batchSave'),
        batchDeleteSpy: vi.spyOn(nangoMock, 'batchDelete'),
        saveCheckpointSpy: vi.spyOn(nangoMock, 'saveCheckpoint'),
        trackDeletesStartSpy: vi.spyOn(nangoMock, 'trackDeletesStart'),
        trackDeletesEndSpy: vi.spyOn(nangoMock, 'trackDeletesEnd')
    };
}

function taskCallParams(paginateSpy: { mock: { calls: unknown[][] } }, listId: string): Record<string, string> | undefined {
    const call = paginateSpy.mock.calls.find((args) => (args[0] as PaginateConfig).endpoint === `/tasks/v1/lists/${listId}/tasks`);
    return (call?.[0] as PaginateConfig | undefined)?.params;
}

describe('google-tasks tasks checkpoint tests', () => {
    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it('runs incrementally per list, saving live tasks and deleting tombstones', async () => {
        const { nangoMock, paginateSpy, batchSaveSpy, batchDeleteSpy, saveCheckpointSpy, trackDeletesStartSpy, trackDeletesEndSpy } = createContext(
            { [`tasklist:${LIST_A}`]: '2026-10-01T00:00:00.000Z', [`tasklist:${LIST_B}`]: '2026-10-01T00:00:00.000Z' },
            {
                [LIST_A]: [task('t1', '2026-10-02T00:00:00.000Z', { deleted: true }), task('t3', '2026-10-01T00:00:00.000Z')],
                [LIST_B]: [task('t2', '2026-10-03T00:00:00.000Z')]
            },
            [LIST_A, LIST_B]
        );

        await createSync.exec(nangoMock);

        expect(taskCallParams(paginateSpy, LIST_A)).toMatchObject({ showDeleted: 'true', showAssigned: 'true', updatedMin: '2026-10-01T00:00:00.000Z' });
        expect(batchDeleteSpy).toHaveBeenCalledWith([{ id: 't1' }], 'Task');
        const saved = batchSaveSpy.mock.calls.flatMap((call) => call[0] as { id: string; tasklistId: string; deleted?: boolean }[]);
        expect(saved.map((record) => [record.id, record.tasklistId])).toEqual([
            ['t3', LIST_A],
            ['t2', LIST_B]
        ]);
        expect(saved.every((record) => record.deleted === undefined)).toBe(true);
        expect(trackDeletesStartSpy).not.toHaveBeenCalled();
        expect(trackDeletesEndSpy).not.toHaveBeenCalled();
        expect(saveCheckpointSpy).toHaveBeenLastCalledWith({
            [`tasklist:${LIST_A}`]: '2026-10-02T00:00:00.000Z',
            [`tasklist:${LIST_B}`]: '2026-10-03T00:00:00.000Z'
        });
    });

    it('runs a full reconcile with trackDeletes and prunes the cursor when a task list vanished', async () => {
        const { nangoMock, paginateSpy, batchDeleteSpy, saveCheckpointSpy, trackDeletesStartSpy, trackDeletesEndSpy } = createContext(
            { [`tasklist:${LIST_A}`]: '2026-10-01T00:00:00.000Z', [`tasklist:${LIST_GONE}`]: '2026-10-01T00:00:00.000Z' },
            { [LIST_A]: [task('t3', '2026-10-01T00:00:00.000Z')] },
            [LIST_A]
        );

        await createSync.exec(nangoMock);

        const params = taskCallParams(paginateSpy, LIST_A);
        expect(params).toMatchObject({ showDeleted: 'false' });
        expect(params).not.toHaveProperty('updatedMin');
        expect(trackDeletesStartSpy).toHaveBeenCalledWith('Task');
        expect(trackDeletesEndSpy).toHaveBeenCalledWith('Task');
        expect(batchDeleteSpy).not.toHaveBeenCalled();
        expect(saveCheckpointSpy).toHaveBeenLastCalledWith({ [`tasklist:${LIST_A}`]: '2026-10-01T00:00:00.000Z' });
        expect(saveCheckpointSpy.mock.invocationCallOrder.at(-1)).toBeGreaterThan(trackDeletesEndSpy.mock.invocationCallOrder[0] ?? Infinity);
    });

    it('skips a task list that 404s mid-run and keeps its cursor so the next run reconciles it', async () => {
        const { nangoMock, saveCheckpointSpy, trackDeletesEndSpy } = createContext(
            { [`tasklist:${LIST_A}`]: '2026-10-01T00:00:00.000Z', [`tasklist:${LIST_B}`]: '2026-10-01T00:00:00.000Z' },
            { [LIST_A]: 'not_found', [LIST_B]: [task('t2', '2026-10-03T00:00:00.000Z')] },
            [LIST_A, LIST_B]
        );

        await createSync.exec(nangoMock);

        expect(trackDeletesEndSpy).not.toHaveBeenCalled();
        expect(saveCheckpointSpy).toHaveBeenLastCalledWith({
            [`tasklist:${LIST_A}`]: '2026-10-01T00:00:00.000Z',
            [`tasklist:${LIST_B}`]: '2026-10-03T00:00:00.000Z'
        });
    });

    it('does not import delete tombstones on the first run', async () => {
        const { nangoMock, paginateSpy, batchSaveSpy, trackDeletesStartSpy, trackDeletesEndSpy } = createContext(
            null,
            { [LIST_A]: [task('t1', '2026-10-02T00:00:00.000Z', { deleted: true }), task('t3', '2026-10-01T00:00:00.000Z')] },
            [LIST_A]
        );

        await createSync.exec(nangoMock);

        expect(taskCallParams(paginateSpy, LIST_A)).toMatchObject({ showDeleted: 'false' });
        const saved = batchSaveSpy.mock.calls.flatMap((call) => call[0] as { id: string }[]);
        expect(saved.map((record) => record.id)).toEqual(['t3']);
        expect(trackDeletesStartSpy).toHaveBeenCalledTimes(1);
        expect(trackDeletesEndSpy).toHaveBeenCalledTimes(1);
    });
});
