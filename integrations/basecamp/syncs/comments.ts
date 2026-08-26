import { createSync } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z
    .object({
        recording_index: z.number().int().describe('Index of the next recording to crawl comments for'),
        next_page_url: z.string().describe('URL of the next comments page to fetch for the current recording')
    })
    .describe('Resume state for the full-refresh comment crawl');

const CommentSchema = z
    .object({
        id: z.string().describe('The unique identifier of the comment'),
        content: z.string().describe('The HTML content of the comment').optional(),
        created_at: z.string().describe('The ISO 8601 timestamp when the comment was created').optional(),
        updated_at: z.string().describe('The ISO 8601 timestamp when the comment was last updated').optional(),
        title: z.string().describe('The auto-generated title of the comment, typically prefixed with Re:').optional(),
        parent_id: z.string().describe('The unique identifier of the parent recording this comment belongs to').optional(),
        parent_type: z.string().describe('The type of the parent recording, e.g. Message, Todo, etc.').optional(),
        project_id: z.string().describe('The unique identifier of the project containing this comment').optional(),
        project_name: z.string().describe('The name of the project containing this comment').optional(),
        creator_id: z.string().describe('The unique identifier of the person who created the comment').optional(),
        creator_name: z.string().describe('The full name of the person who created the comment').optional(),
        creator_email: z.string().describe('The email address of the person who created the comment').optional()
    })
    .describe('A comment posted on a Basecamp recording');

const ProjectSchema = z.object({
    id: z.number()
});

const ProjectDetailSchema = z.object({
    id: z.number(),
    dock: z
        .array(
            z.object({
                id: z.number(),
                name: z.string()
            })
        )
        .optional()
});

const TodoListSchema = z.object({
    id: z.number()
});

const MessageSchema = z.object({
    id: z.number()
});

const DocumentSchema = z.object({
    id: z.number()
});

const UploadSchema = z.object({
    id: z.number()
});

const ScheduleEntrySchema = z.object({
    id: z.number()
});

const CardTableSchema = z.object({
    id: z.number(),
    lists: z
        .array(
            z.object({
                id: z.number()
            })
        )
        .optional()
});

const CardSchema = z.object({
    id: z.number()
});

const ProviderCommentSchema = z.object({
    id: z.number(),
    content: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    title: z.string().optional(),
    parent: z
        .object({
            id: z.number(),
            title: z.string().optional(),
            type: z.string().optional()
        })
        .optional(),
    bucket: z
        .object({
            id: z.number(),
            name: z.string().optional(),
            type: z.string().optional()
        })
        .optional(),
    creator: z
        .object({
            id: z.number(),
            name: z.string().optional(),
            email_address: z.string().optional()
        })
        .optional()
});

type RecordingRef = {
    projectId: string;
    recordingId: string;
};

function parseCheckpointUrl(url: string): { baseUrlOverride: string | undefined; endpoint: string } {
    // @allowTryCatch
    try {
        const parsed = new URL(url);
        return {
            baseUrlOverride: parsed.origin,
            endpoint: parsed.pathname + parsed.search
        };
    } catch {
        return { baseUrlOverride: undefined, endpoint: url };
    }
}

async function fetchProjectIds(nango: NangoSyncLocal): Promise<string[]> {
    const projectIds: string[] = [];
    // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/projects.md
    for await (const page of nango.paginate<unknown>({
        endpoint: '/projects.json',
        paginate: {
            type: 'link',
            link_rel_in_response_header: 'next',
            limit_name_in_request: 'page'
        },
        retries: 3
    })) {
        const projects = z.array(ProjectSchema).parse(page);
        for (const project of projects) {
            projectIds.push(String(project.id));
        }
    }
    return projectIds;
}

async function fetchRecordingIds(nango: NangoSyncLocal): Promise<RecordingRef[]> {
    const recordings: RecordingRef[] = [];
    const projectIds = await fetchProjectIds(nango);

    for (const projectId of projectIds) {
        // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/projects.md
        const projectResponse = await nango.get({
            endpoint: `/projects/${encodeURIComponent(projectId)}.json`,
            retries: 3
        });
        const projectDetail = ProjectDetailSchema.parse(projectResponse.data);
        const dock = projectDetail.dock ?? [];

        const todosetId = dock.find((tool) => tool.name === 'todoset')?.id;
        const messageBoardId = dock.find((tool) => tool.name === 'message_board')?.id;
        const vaultId = dock.find((tool) => tool.name === 'vault')?.id;
        const scheduleId = dock.find((tool) => tool.name === 'schedule')?.id;
        const kanbanBoardId = dock.find((tool) => tool.name === 'kanban_board')?.id;

        if (todosetId) {
            const todolistIds: string[] = [];
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/todosets.md
            for await (const page of nango.paginate<unknown>({
                endpoint: `/buckets/${encodeURIComponent(projectId)}/todosets/${encodeURIComponent(String(todosetId))}/todolists.json`,
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'page'
                },
                retries: 3
            })) {
                const todolists = z.array(TodoListSchema).parse(page);
                for (const todolist of todolists) {
                    todolistIds.push(String(todolist.id));
                    recordings.push({ projectId, recordingId: String(todolist.id) });
                }
            }

            for (const todolistId of todolistIds) {
                // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/todolists.md
                for await (const page of nango.paginate<unknown>({
                    endpoint: `/buckets/${encodeURIComponent(projectId)}/todolists/${encodeURIComponent(todolistId)}/todos.json`,
                    paginate: {
                        type: 'link',
                        link_rel_in_response_header: 'next',
                        limit_name_in_request: 'page'
                    },
                    retries: 3
                })) {
                    const todos = z.array(z.object({ id: z.number() })).parse(page);
                    for (const todo of todos) {
                        recordings.push({ projectId, recordingId: String(todo.id) });
                    }
                }
            }
        }

        if (messageBoardId) {
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/message_boards.md
            for await (const page of nango.paginate<unknown>({
                endpoint: `/buckets/${encodeURIComponent(projectId)}/message_boards/${encodeURIComponent(String(messageBoardId))}/messages.json`,
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'page'
                },
                retries: 3
            })) {
                const messages = z.array(MessageSchema).parse(page);
                for (const message of messages) {
                    recordings.push({ projectId, recordingId: String(message.id) });
                }
            }
        }

        if (vaultId) {
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/vaults.md
            for await (const page of nango.paginate<unknown>({
                endpoint: `/buckets/${encodeURIComponent(projectId)}/vaults/${encodeURIComponent(String(vaultId))}/documents.json`,
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'page'
                },
                retries: 3
            })) {
                const documents = z.array(DocumentSchema).parse(page);
                for (const document of documents) {
                    recordings.push({ projectId, recordingId: String(document.id) });
                }
            }

            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/vaults.md
            for await (const page of nango.paginate<unknown>({
                endpoint: `/buckets/${encodeURIComponent(projectId)}/vaults/${encodeURIComponent(String(vaultId))}/uploads.json`,
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'page'
                },
                retries: 3
            })) {
                const uploads = z.array(UploadSchema).parse(page);
                for (const upload of uploads) {
                    recordings.push({ projectId, recordingId: String(upload.id) });
                }
            }
        }

        if (scheduleId) {
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/schedules.md
            for await (const page of nango.paginate<unknown>({
                endpoint: `/buckets/${encodeURIComponent(projectId)}/schedules/${encodeURIComponent(String(scheduleId))}/entries.json`,
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'page'
                },
                retries: 3
            })) {
                const entries = z.array(ScheduleEntrySchema).parse(page);
                for (const entry of entries) {
                    recordings.push({ projectId, recordingId: String(entry.id) });
                }
            }
        }

        if (kanbanBoardId) {
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/card_tables.md
            const cardTableResponse = await nango.get({
                endpoint: `/buckets/${encodeURIComponent(projectId)}/card_tables/${encodeURIComponent(String(kanbanBoardId))}.json`,
                retries: 3
            });
            const cardTable = CardTableSchema.parse(cardTableResponse.data);

            for (const column of cardTable.lists ?? []) {
                // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/card_table_columns.md
                for await (const page of nango.paginate<unknown>({
                    endpoint: `/buckets/${encodeURIComponent(projectId)}/card_tables/lists/${encodeURIComponent(String(column.id))}/cards.json`,
                    paginate: {
                        type: 'link',
                        link_rel_in_response_header: 'next',
                        limit_name_in_request: 'page'
                    },
                    retries: 3
                })) {
                    const cards = z.array(CardSchema).parse(page);
                    for (const card of cards) {
                        recordings.push({ projectId, recordingId: String(card.id) });
                    }
                }
            }
        }
    }

    return recordings;
}

function mapComment(comment: z.infer<typeof ProviderCommentSchema>): z.infer<typeof CommentSchema> {
    return {
        id: String(comment.id),
        content: comment.content,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        title: comment.title,
        parent_id: comment.parent ? String(comment.parent.id) : undefined,
        parent_type: comment.parent ? comment.parent.type : undefined,
        project_id: comment.bucket ? String(comment.bucket.id) : undefined,
        project_name: comment.bucket ? comment.bucket.name : undefined,
        creator_id: comment.creator ? String(comment.creator.id) : undefined,
        creator_name: comment.creator ? comment.creator.name : undefined,
        creator_email: comment.creator ? comment.creator.email_address : undefined
    };
}

const sync = createSync({
    description: 'Sync comments across all known recordings',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Comment: CommentSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const recordings = await fetchRecordingIds(nango);

        await nango.trackDeletesStart('Comment');

        if (recordings.length > 0) {
            let recordingIndex = checkpoint?.recording_index ?? 0;
            let nextPageUrl = checkpoint?.next_page_url ?? '';

            if (recordingIndex >= recordings.length) {
                recordingIndex = 0;
                nextPageUrl = '';
            }

            for (let i = recordingIndex; i < recordings.length; i++) {
                const recording = recordings[i];
                if (!recording) {
                    continue;
                }
                const { projectId, recordingId } = recording;
                const { baseUrlOverride, endpoint } = parseCheckpointUrl(nextPageUrl);
                const commentEndpoint = endpoint || `/buckets/${encodeURIComponent(projectId)}/recordings/${encodeURIComponent(recordingId)}/comments.json`;
                let nextPageUrlForRecording: string | undefined = nextPageUrl || undefined;

                // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/comments.md
                for await (const page of nango.paginate<unknown>({
                    ...(baseUrlOverride && { baseUrlOverride }),
                    endpoint: commentEndpoint,
                    paginate: {
                        type: 'link',
                        link_rel_in_response_header: 'next',
                        limit_name_in_request: 'page',
                        on_page: async ({ nextPageParam }) => {
                            nextPageUrlForRecording = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                        }
                    },
                    retries: 3
                })) {
                    const comments = z.array(ProviderCommentSchema).parse(page).map(mapComment);
                    if (comments.length > 0) {
                        await nango.batchSave(comments, 'Comment');
                    }

                    if (nextPageUrlForRecording) {
                        await nango.saveCheckpoint({ recording_index: i, next_page_url: nextPageUrlForRecording });
                    }
                }

                nextPageUrl = '';
                await nango.saveCheckpoint({ recording_index: i + 1, next_page_url: '' });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Comment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
