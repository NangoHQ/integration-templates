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

const sync = createSync({
    description: 'Sync comments from ClickUp',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    metadata: SyncConfigSchema,
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

        await nango.trackDeletesStart('Comment');

        // https://developer.clickup.com/reference/getauthorizedteams
        const teamsResponse = await nango.get({
            endpoint: '/api/v2/team',
            retries: 3
        });

        const teams = teamsResponse.data.teams || [];
        const allComments: Array<{
            id: string;
            comment_text?: string;
            user?: unknown;
            date?: string;
            reply_count?: number;
        }> = [];

        for (const team of teams) {
            if (team.id !== config.team_id) {
                continue;
            }

            // https://developer.clickup.com/reference/getspaces
            const spacesResponse = await nango.get({
                endpoint: `/api/v2/team/${encodeURIComponent(team.id)}/space`,
                retries: 3
            });

            const spaces = spacesResponse.data.spaces || [];

            for (const space of spaces) {
                const spaceId = String(space.id);

                // https://developer.clickup.com/reference/getfolders
                const foldersResponse = await nango.get({
                    endpoint: `/api/v2/space/${encodeURIComponent(spaceId)}/folder`,
                    retries: 3
                });

                const folders = foldersResponse.data.folders || [];

                for (const folder of folders) {
                    const folderId = String(folder.id);

                    // https://developer.clickup.com/reference/getlists
                    const listsResponse = await nango.get({
                        endpoint: `/api/v2/folder/${encodeURIComponent(folderId)}/list`,
                        retries: 3
                    });

                    const lists = listsResponse.data.lists || [];

                    for (const list of lists) {
                        const listId = String(list.id);

                        // https://developer.clickup.com/reference/getlistcomments
                        const listCommentsResponse = await nango.get({
                            endpoint: `/api/v2/list/${encodeURIComponent(listId)}/comment`,
                            retries: 3
                        });

                        const listComments = listCommentsResponse.data.comments || [];
                        for (const comment of listComments) {
                            const mappedComment: {
                                id: string;
                                comment_text?: string;
                                user?: unknown;
                                date?: string;
                                reply_count?: number;
                            } = {
                                id: String(comment.id)
                            };
                            if (comment.comment_text !== undefined) {
                                mappedComment.comment_text = String(comment.comment_text);
                            }
                            if (comment.user !== undefined) {
                                mappedComment.user = comment.user;
                            }
                            if (comment.date !== undefined) {
                                mappedComment.date = String(comment.date);
                            }
                            if (comment.reply_count !== undefined) {
                                mappedComment.reply_count = Number(comment.reply_count);
                            }
                            allComments.push(mappedComment);
                        }

                        // https://developer.clickup.com/reference/gettasks
                        const tasksResponse = await nango.get({
                            endpoint: `/api/v2/list/${encodeURIComponent(listId)}/task`,
                            retries: 3
                        });

                        const tasks = tasksResponse.data.tasks || [];

                        for (const task of tasks) {
                            const taskId = String(task.id);

                            // https://developer.clickup.com/reference/gettaskcomments
                            const taskCommentsResponse = await nango.get({
                                endpoint: `/api/v2/task/${encodeURIComponent(taskId)}/comment`,
                                retries: 3
                            });

                            const taskComments = taskCommentsResponse.data.comments || [];
                            for (const comment of taskComments) {
                                const mappedComment: {
                                    id: string;
                                    comment_text?: string;
                                    user?: unknown;
                                    date?: string;
                                    reply_count?: number;
                                } = {
                                    id: String(comment.id)
                                };
                                if (comment.comment_text !== undefined) {
                                    mappedComment.comment_text = String(comment.comment_text);
                                }
                                if (comment.user !== undefined) {
                                    mappedComment.user = comment.user;
                                }
                                if (comment.date !== undefined) {
                                    mappedComment.date = String(comment.date);
                                }
                                if (comment.reply_count !== undefined) {
                                    mappedComment.reply_count = Number(comment.reply_count);
                                }
                                allComments.push(mappedComment);
                            }
                        }
                    }
                }
            }
        }

        if (allComments.length > 0) {
            await nango.batchSave(allComments, 'Comment');
        }

        await nango.trackDeletesEnd('Comment');
    }
});

export default sync;
