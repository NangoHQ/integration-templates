import { afterEach, describe, expect, it, vi } from 'vitest';

import createSync from '../syncs/comments.js';

describe('todoist comments checkpoint tests', () => {
    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it('resumes the task-scoped crawl from the saved cursor and skips finished project scopes', async () => {
        const nangoMock = new global.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'comments',
            Model: 'Comment'
        });

        const getCheckpointMock = nangoMock.getCheckpoint as unknown as { mockResolvedValue: (value: unknown) => void };
        getCheckpointMock.mockResolvedValue({
            phase: 'task',
            scope_id: 'task-2',
            cursor: 'comment-cursor',
            cursor_active: true
        });

        const commentRequests: Array<Record<string, string>> = [];
        vi.spyOn(nangoMock, 'paginate').mockImplementation(async function* (config: any) {
            if (config.endpoint === '/api/v1/projects') {
                yield [{ id: 'project-1' }];
                return;
            }

            if (config.endpoint === '/api/v1/tasks') {
                yield [{ id: 'task-1' }, { id: 'task-2' }, { id: 'task-3' }];
                return;
            }

            if (config.endpoint === '/api/v1/tasks/completed/by_completion_date') {
                yield [];
                return;
            }

            if (config.endpoint === '/api/v1/comments') {
                commentRequests.push(config.params);
                await config.paginate.on_page?.({ nextPageParam: undefined });

                if (config.params.task_id === 'task-2') {
                    yield [
                        {
                            id: 'comment-1',
                            content: 'Comment 1',
                            posted_uid: 'user-1',
                            posted_at: '2026-07-21T00:00:00Z',
                            task_id: 'task-2',
                            is_deleted: false
                        }
                    ];
                    return;
                }

                if (config.params.task_id === 'task-3') {
                    yield [];
                    return;
                }
            }

            throw new Error(`Unexpected paginate config: ${JSON.stringify(config)}`);
        });

        const saveCheckpointSpy = vi.spyOn(nangoMock, 'saveCheckpoint');
        const clearCheckpointSpy = vi.spyOn(nangoMock, 'clearCheckpoint');
        const trackDeletesEndSpy = vi.spyOn(nangoMock, 'trackDeletesEnd');

        await createSync.exec(nangoMock);

        expect(commentRequests).toStrictEqual([{ task_id: 'task-2', cursor: 'comment-cursor' }, { task_id: 'task-3' }]);
        expect(saveCheckpointSpy).toHaveBeenCalledWith({
            phase: 'task',
            scope_id: 'task-2',
            cursor: 'comment-cursor',
            cursor_active: true
        });
        expect(clearCheckpointSpy.mock.invocationCallOrder[0]).toBeLessThan(trackDeletesEndSpy.mock.invocationCallOrder[0]);
    });
});
