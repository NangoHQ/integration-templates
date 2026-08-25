import { createSync } from 'nango';
import { z } from 'zod';

const CommentSchema = z.object({
    id: z.string(),
    comment_text: z.string().optional(),
    user: z.unknown().optional(),
    date: z.string().optional(),
    reply_count: z.number().optional()
});

const SyncConfigSchema = z.object({
    team_id: z.string()
});

const CheckpointSchema = z.object({
    space_id: z.string(),
    folder_id: z.string(),
    list_id: z.string(),
    list_comment_cursor: z.string(),
    task_page: z.number().int(),
    task_id: z.string(),
    task_comment_cursor: z.string()
});

const DEFAULT_CHECKPOINT: z.infer<typeof CheckpointSchema> = {
    space_id: '',
    folder_id: '',
    list_id: '',
    list_comment_cursor: '',
    task_page: -1,
    task_id: '',
    task_comment_cursor: ''
};

const TeamItemSchema = z.object({
    id: z.unknown()
});

const SpaceItemSchema = z.object({
    id: z.unknown()
});

const FolderItemSchema = z.object({
    id: z.unknown()
});

const ListItemSchema = z.object({
    id: z.unknown()
});

const TaskItemSchema = z.object({
    id: z.unknown()
});

const CommentItemSchema = z.record(z.string(), z.unknown());

const TeamsResponseSchema = z.object({
    teams: z.array(z.unknown()).optional()
});

const SpacesResponseSchema = z.object({
    spaces: z.array(z.unknown()).optional()
});

const FoldersResponseSchema = z.object({
    folders: z.array(z.unknown()).optional()
});

const ListsResponseSchema = z.object({
    lists: z.array(z.unknown()).optional()
});

const ListCommentsResponseSchema = z.object({
    comments: z.array(z.unknown()).optional(),
    next_id: z.string().optional()
});

const TasksResponseSchema = z.object({
    tasks: z.array(z.unknown()).optional(),
    last_page: z.boolean().optional()
});

const TaskCommentsResponseSchema = z.object({
    comments: z.array(z.unknown()).optional(),
    next_id: z.string().optional()
});

const sync = createSync({
    description: 'Sync comments from ClickUp',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',
    metadata: SyncConfigSchema,
    checkpoint: CheckpointSchema,
    models: {
        Comment: CommentSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/comments'
        }
    ],
    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const config = SyncConfigSchema.parse(metadata);

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? DEFAULT_CHECKPOINT);

        // https://developer.clickup.com/reference/getauthorizedteams
        const teamsResponse = await nango.get({
            endpoint: '/api/v2/team',
            retries: 3
        });

        const teamsData = TeamsResponseSchema.parse(teamsResponse.data);
        const teams = teamsData.teams ?? [];
        const hasConfiguredTeam = teams.some((team) => String(TeamItemSchema.parse(team).id) === config.team_id);
        if (!hasConfiguredTeam) {
            throw new Error(`Configured team ${config.team_id} is no longer accessible`);
        }

        await nango.trackDeletesStart('Comment');

        for (const team of teams) {
            const teamId = String(TeamItemSchema.parse(team).id);

            if (teamId !== config.team_id) {
                continue;
            }

            // https://developer.clickup.com/reference/getspaces
            const spacesResponse = await nango.get({
                endpoint: `/api/v2/team/${encodeURIComponent(teamId)}/space`,
                retries: 3
            });

            const spacesData = SpacesResponseSchema.parse(spacesResponse.data);
            const spaces = spacesData.spaces ?? [];

            if (checkpoint.space_id !== '' && !spaces.some((space) => String(SpaceItemSchema.parse(space).id) === checkpoint.space_id)) {
                await nango.saveCheckpoint(DEFAULT_CHECKPOINT);
                throw new Error(`Checkpointed space ${checkpoint.space_id} is no longer accessible; restarting hierarchy enumeration`);
            }

            let skipSpace = checkpoint.space_id !== '';

            for (let spaceIdx = 0; spaceIdx < spaces.length; spaceIdx++) {
                const space = spaces[spaceIdx];
                const spaceId = String(SpaceItemSchema.parse(space).id);

                if (skipSpace) {
                    if (spaceId !== checkpoint.space_id) {
                        continue;
                    }
                    skipSpace = false;
                }

                // Save checkpoint for this space before descending
                await nango.saveCheckpoint({ ...DEFAULT_CHECKPOINT, space_id: spaceId });

                // https://developer.clickup.com/reference/getfolders
                const foldersResponse = await nango.get({
                    endpoint: `/api/v2/space/${encodeURIComponent(spaceId)}/folder`,
                    retries: 3
                });

                const foldersData = FoldersResponseSchema.parse(foldersResponse.data);
                const folders = foldersData.folders ?? [];

                const isResumedSpace = checkpoint.space_id !== '' && spaceId === checkpoint.space_id;
                if (
                    isResumedSpace &&
                    checkpoint.folder_id !== '' &&
                    !folders.some((folder) => String(FolderItemSchema.parse(folder).id) === checkpoint.folder_id)
                ) {
                    await nango.saveCheckpoint({ ...DEFAULT_CHECKPOINT, space_id: spaceId });
                    throw new Error(`Checkpointed folder ${checkpoint.folder_id} is no longer accessible; restarting space enumeration`);
                }
                let skipFolder = isResumedSpace && checkpoint.folder_id !== '';

                for (let folderIdx = 0; folderIdx < folders.length; folderIdx++) {
                    const folder = folders[folderIdx];
                    const folderId = String(FolderItemSchema.parse(folder).id);

                    if (skipFolder) {
                        if (folderId !== checkpoint.folder_id) {
                            continue;
                        }
                        skipFolder = false;
                    }

                    // Save checkpoint for this folder before descending
                    await nango.saveCheckpoint({ ...DEFAULT_CHECKPOINT, space_id: spaceId, folder_id: folderId });

                    // https://developer.clickup.com/reference/getlists
                    const listsResponse = await nango.get({
                        endpoint: `/api/v2/folder/${encodeURIComponent(folderId)}/list`,
                        retries: 3
                    });

                    const listsData = ListsResponseSchema.parse(listsResponse.data);
                    const lists = listsData.lists ?? [];

                    const isResumedFolder = isResumedSpace && checkpoint.folder_id !== '' && folderId === checkpoint.folder_id;
                    if (isResumedFolder && checkpoint.list_id !== '' && !lists.some((list) => String(ListItemSchema.parse(list).id) === checkpoint.list_id)) {
                        await nango.saveCheckpoint({ ...DEFAULT_CHECKPOINT, space_id: spaceId, folder_id: folderId });
                        throw new Error(`Checkpointed list ${checkpoint.list_id} is no longer accessible; restarting folder enumeration`);
                    }
                    let skipList = isResumedFolder && checkpoint.list_id !== '';

                    for (let listIdx = 0; listIdx < lists.length; listIdx++) {
                        const list = lists[listIdx];
                        const listId = String(ListItemSchema.parse(list).id);

                        if (skipList) {
                            if (listId !== checkpoint.list_id) {
                                continue;
                            }
                            skipList = false;
                        }

                        // Save checkpoint for this list before processing its comments
                        await nango.saveCheckpoint({ ...DEFAULT_CHECKPOINT, space_id: spaceId, folder_id: folderId, list_id: listId });

                        const isResumedList = isResumedFolder && checkpoint.list_id !== '' && listId === checkpoint.list_id;
                        const shouldProcessListComments = !isResumedList || checkpoint.task_page === -1;

                        if (shouldProcessListComments) {
                            // Paginate list comments using cursor (start_id)
                            // https://developer.clickup.com/reference/getlistcomments
                            let listCommentCursor = isResumedList && checkpoint.list_comment_cursor !== '' ? checkpoint.list_comment_cursor : undefined;
                            do {
                                const listCommentsResponse = await nango.get({
                                    endpoint: `/api/v2/list/${encodeURIComponent(listId)}/comment`,
                                    params: listCommentCursor ? { start_id: listCommentCursor } : {},
                                    retries: 3
                                });

                                const listCommentsData = ListCommentsResponseSchema.parse(listCommentsResponse.data);
                                const listComments = listCommentsData.comments ?? [];
                                const mappedListComments = listComments.map((comment) => mapComment(CommentItemSchema.parse(comment)));

                                if (mappedListComments.length > 0) {
                                    await nango.batchSave(mappedListComments, 'Comment');
                                }

                                listCommentCursor = listCommentsData.next_id ?? undefined;
                                if (listCommentCursor !== undefined) {
                                    await nango.saveCheckpoint({
                                        ...DEFAULT_CHECKPOINT,
                                        space_id: spaceId,
                                        folder_id: folderId,
                                        list_id: listId,
                                        list_comment_cursor: listCommentCursor
                                    });
                                }

                                if (listComments.length === 0) {
                                    break;
                                }
                            } while (listCommentCursor);

                            // After list comments, transition to tasks phase
                            await nango.saveCheckpoint({
                                ...DEFAULT_CHECKPOINT,
                                space_id: spaceId,
                                folder_id: folderId,
                                list_id: listId,
                                list_comment_cursor: '',
                                task_page: 0
                            });
                        }

                        // Paginate tasks with page-based pagination
                        // https://developer.clickup.com/reference/gettasks
                        let taskPage = isResumedList && checkpoint.task_page !== -1 ? checkpoint.task_page : 0;
                        let hasMoreTasks = true;

                        while (hasMoreTasks) {
                            const tasksResponse = await nango.get({
                                endpoint: `/api/v2/list/${encodeURIComponent(listId)}/task`,
                                params: { page: taskPage, include_closed: 'true' },
                                retries: 3
                            });

                            const tasksData = TasksResponseSchema.parse(tasksResponse.data);
                            const tasks = tasksData.tasks ?? [];
                            const lastPage = tasksData.last_page ?? false;

                            const isCheckpointTaskPage = isResumedList && taskPage === checkpoint.task_page && checkpoint.task_id !== '';
                            if (isCheckpointTaskPage && !tasks.some((task) => String(TaskItemSchema.parse(task).id) === checkpoint.task_id)) {
                                await nango.saveCheckpoint({
                                    ...DEFAULT_CHECKPOINT,
                                    space_id: spaceId,
                                    folder_id: folderId,
                                    list_id: listId,
                                    task_page: 0
                                });
                                throw new Error(`Checkpointed task ${checkpoint.task_id} is no longer accessible; restarting task enumeration`);
                            }

                            let skipTask = isCheckpointTaskPage;

                            for (let taskIdx = 0; taskIdx < tasks.length; taskIdx++) {
                                const task = tasks[taskIdx];
                                const taskId = String(TaskItemSchema.parse(task).id);

                                if (skipTask) {
                                    if (taskId !== checkpoint.task_id) {
                                        continue;
                                    }
                                    skipTask = false;
                                }

                                // Save checkpoint for this task before processing its comments
                                await nango.saveCheckpoint({
                                    ...DEFAULT_CHECKPOINT,
                                    space_id: spaceId,
                                    folder_id: folderId,
                                    list_id: listId,
                                    task_page: taskPage,
                                    task_id: taskId
                                });

                                const isResumedTask = isResumedList && checkpoint.task_id !== '' && taskId === checkpoint.task_id;

                                // Paginate task comments using cursor
                                // https://developer.clickup.com/reference/gettaskcomments
                                let taskCommentCursor = isResumedTask && checkpoint.task_comment_cursor !== '' ? checkpoint.task_comment_cursor : undefined;
                                do {
                                    const taskCommentsResponse = await nango.get({
                                        endpoint: `/api/v2/task/${encodeURIComponent(taskId)}/comment`,
                                        params: taskCommentCursor ? { start_id: taskCommentCursor } : {},
                                        retries: 3
                                    });

                                    const taskCommentsData = TaskCommentsResponseSchema.parse(taskCommentsResponse.data);
                                    const taskComments = taskCommentsData.comments ?? [];
                                    const mappedTaskComments = taskComments.map((comment) => mapComment(CommentItemSchema.parse(comment)));

                                    if (mappedTaskComments.length > 0) {
                                        await nango.batchSave(mappedTaskComments, 'Comment');
                                    }

                                    taskCommentCursor = taskCommentsData.next_id ?? undefined;
                                    if (taskCommentCursor !== undefined) {
                                        await nango.saveCheckpoint({
                                            ...DEFAULT_CHECKPOINT,
                                            space_id: spaceId,
                                            folder_id: folderId,
                                            list_id: listId,
                                            task_page: taskPage,
                                            task_id: taskId,
                                            task_comment_cursor: taskCommentCursor
                                        });
                                    }

                                    if (taskComments.length === 0) {
                                        break;
                                    }
                                } while (taskCommentCursor);

                                // After finishing this task, point to next task or clear task id
                                const nextTask = tasks[taskIdx + 1];
                                if (nextTask) {
                                    await nango.saveCheckpoint({
                                        ...DEFAULT_CHECKPOINT,
                                        space_id: spaceId,
                                        folder_id: folderId,
                                        list_id: listId,
                                        task_page: taskPage,
                                        task_id: String(TaskItemSchema.parse(nextTask).id)
                                    });
                                }
                            }

                            if (lastPage || tasks.length === 0) {
                                hasMoreTasks = false;
                            } else {
                                taskPage += 1;
                                await nango.saveCheckpoint({
                                    ...DEFAULT_CHECKPOINT,
                                    space_id: spaceId,
                                    folder_id: folderId,
                                    list_id: listId,
                                    task_page: taskPage,
                                    task_id: skipTask ? checkpoint.task_id : ''
                                });
                            }
                        }

                        // After finishing this list, point to next list or clear list id
                        const nextList = lists[listIdx + 1];
                        if (nextList) {
                            await nango.saveCheckpoint({
                                ...DEFAULT_CHECKPOINT,
                                space_id: spaceId,
                                folder_id: folderId,
                                list_id: String(ListItemSchema.parse(nextList).id)
                            });
                        } else {
                            await nango.saveCheckpoint({
                                ...DEFAULT_CHECKPOINT,
                                space_id: spaceId,
                                folder_id: folderId
                            });
                        }
                    }

                    // After finishing this folder, point to next folder or clear folder id
                    const nextFolder = folders[folderIdx + 1];
                    if (nextFolder) {
                        await nango.saveCheckpoint({
                            ...DEFAULT_CHECKPOINT,
                            space_id: spaceId,
                            folder_id: String(FolderItemSchema.parse(nextFolder).id)
                        });
                    } else {
                        await nango.saveCheckpoint({
                            ...DEFAULT_CHECKPOINT,
                            space_id: spaceId
                        });
                    }
                }

                // After finishing this space, point to next space or clear space id
                const nextSpace = spaces[spaceIdx + 1];
                if (nextSpace) {
                    await nango.saveCheckpoint({
                        ...DEFAULT_CHECKPOINT,
                        space_id: String(SpaceItemSchema.parse(nextSpace).id)
                    });
                }
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Comment');
    }
});

function mapComment(comment: Record<string, unknown>): {
    id: string;
    comment_text?: string;
    user?: unknown;
    date?: string;
    reply_count?: number;
} {
    const mapped: { id: string; comment_text?: string; user?: unknown; date?: string; reply_count?: number } = {
        id: String(comment['id'])
    };
    if (comment['comment_text'] !== undefined) {
        mapped.comment_text = String(comment['comment_text']);
    }
    if (comment['user'] !== undefined) {
        mapped.user = comment['user'];
    }
    if (comment['date'] !== undefined) {
        mapped.date = String(comment['date']);
    }
    if (comment['reply_count'] !== undefined) {
        mapped.reply_count = Number(comment['reply_count']);
    }
    return mapped;
}

export default sync;
