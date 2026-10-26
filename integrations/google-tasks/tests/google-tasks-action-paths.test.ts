import { afterEach, describe, expect, it, vi } from 'vitest';

import completeTaskAndVerify from '../actions/complete-task-and-verify.js';
import findOrCreateTask from '../actions/find-or-create-task-in-tasklist.js';

type RequestConfig = { endpoint: string; params?: Record<string, string | number> };

const task = (id: string, extra: Record<string, unknown> = {}) => ({ kind: 'tasks#task', id, title: `Task ${id}`, status: 'needsAction', ...extra });

describe('google-tasks action paths', () => {
    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it('find-or-create returns an existing task on a later page without creating anything', async () => {
        const nangoMock = new global.vitest.NangoActionMock({
            dirname: __dirname,
            name: 'find-or-create-task-in-tasklist',
            Model: 'ActionOutput_google_tasks_findorcreatetaskintasklist'
        });

        vi.spyOn(nangoMock, 'get').mockImplementation((async (config: RequestConfig) => {
            if (config.endpoint === '/tasks/v1/users/@me/lists') {
                return { data: { items: [{ id: 'list-1', title: 'Groceries' }] }, status: 200, headers: {} };
            }
            if (config.params?.['pageToken'] === 'page-2') {
                return {
                    data: { items: [task('deleted-match', { title: 'Buy milk', deleted: true }), task('match', { title: 'Buy milk', status: 'completed' })] },
                    status: 200,
                    headers: {}
                };
            }
            return { data: { items: [task('other', { title: 'Buy bread' })], nextPageToken: 'page-2' }, status: 200, headers: {} };
        }) as never);
        const postSpy = vi.spyOn(nangoMock, 'post');

        const result = await findOrCreateTask.exec(nangoMock, { listName: 'Groceries', title: 'Buy milk' });

        expect(postSpy).not.toHaveBeenCalled();
        expect(result).toMatchObject({ task: { id: 'match', status: 'completed' }, tasklist: { id: 'list-1' }, tasklistCreated: false, taskCreated: false });
    });

    it('find-or-create only matches subtasks of the given parent', async () => {
        const nangoMock = new global.vitest.NangoActionMock({
            dirname: __dirname,
            name: 'find-or-create-task-in-tasklist',
            Model: 'ActionOutput_google_tasks_findorcreatetaskintasklist'
        });

        vi.spyOn(nangoMock, 'get').mockImplementation((async (config: RequestConfig) => {
            if (config.endpoint === '/tasks/v1/users/@me/lists') {
                return { data: { items: [{ id: 'list-1', title: 'Groceries' }] }, status: 200, headers: {} };
            }
            return { data: { items: [task('top-level', { title: 'Buy milk' })] }, status: 200, headers: {} };
        }) as never);
        const postSpy = vi.spyOn(nangoMock, 'post').mockResolvedValue({ data: task('new', { title: 'Buy milk', parent: 'p1' }), status: 200, headers: {} } as never);

        const result = await findOrCreateTask.exec(nangoMock, { listName: 'Groceries', title: 'Buy milk', parent: 'p1' });

        expect(postSpy).toHaveBeenCalledTimes(1);
        expect(postSpy.mock.calls[0]?.[0]).toMatchObject({ endpoint: '/tasks/v1/lists/list-1/tasks', params: { parent: 'p1' } });
        expect(result).toMatchObject({ task: { id: 'new' }, taskCreated: true, tasklistCreated: false });
    });

    it('complete-task-and-verify pages through the whole list to count cascaded subtasks', async () => {
        const nangoMock = new global.vitest.NangoActionMock({
            dirname: __dirname,
            name: 'complete-task-and-verify',
            Model: 'ActionOutput_google_tasks_completetaskandverify'
        });

        vi.spyOn(nangoMock, 'patch').mockResolvedValue({ data: task('parent', { status: 'completed' }), status: 200, headers: {} } as never);
        const getSpy = vi.spyOn(nangoMock, 'get').mockImplementation((async (config: RequestConfig) => {
            if (config.endpoint.endsWith('/tasks/parent')) {
                return { data: task('parent', { status: 'completed' }), status: 200, headers: {} };
            }
            if (config.params?.['pageToken'] === 'page-2') {
                return { data: { items: [task('child-2', { parent: 'parent', status: 'completed' })] }, status: 200, headers: {} };
            }
            return {
                data: {
                    items: [task('child-1', { parent: 'parent', status: 'completed' }), task('unrelated', { status: 'completed' })],
                    nextPageToken: 'page-2'
                },
                status: 200,
                headers: {}
            };
        }) as never);

        const result = await completeTaskAndVerify.exec(nangoMock, { tasklist: 'list-1', task: 'parent' });

        const listCalls = getSpy.mock.calls.filter((call) => (call[0] as RequestConfig).endpoint === '/tasks/v1/lists/list-1/tasks');
        expect(listCalls).toHaveLength(2);
        expect((listCalls[0]?.[0] as RequestConfig).params).toMatchObject({ maxResults: 100, showCompleted: 'true', showHidden: 'true' });
        expect(result.cascadedSubtasks.map((subtask) => subtask.id)).toEqual(['child-1', 'child-2']);
    });
});
