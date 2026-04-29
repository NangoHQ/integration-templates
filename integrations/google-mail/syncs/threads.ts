import { createSync } from 'nango';
import { z } from 'zod';

// https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads#Thread
const ThreadSchema = z.object({
    id: z.string(),
    historyId: z.string(),
    messages: z
        .array(
            z.object({
                id: z.string(),
                threadId: z.string(),
                labelIds: z.array(z.string()).optional(),
                snippet: z.string().optional(),
                historyId: z.string().optional(),
                internalDate: z.string().optional(),
                payload: z
                    .object({
                        partId: z.string().optional(),
                        mimeType: z.string().optional(),
                        filename: z.string().optional(),
                        headers: z
                            .array(
                                z.object({
                                    name: z.string(),
                                    value: z.string()
                                })
                            )
                            .optional(),
                        body: z
                            .object({
                                attachmentId: z.string().optional(),
                                size: z.number().optional(),
                                data: z.string().optional()
                            })
                            .optional(),
                        parts: z.array(z.unknown()).optional()
                    })
                    .optional(),
                sizeEstimate: z.number().optional(),
                raw: z.string().optional()
            })
        )
        .optional()
});

const CheckpointSchema = z.object({
    phase: z.string(),
    history_id: z.string(),
    page_token: z.string(),
    backfill_history_id: z.string()
});

const LegacyCheckpointSchema = z.object({
    phase: z.string().optional(),
    history_id: z.string().optional(),
    page_token: z.string().optional(),
    backfill_history_id: z.string().optional()
});

type Checkpoint = z.infer<typeof LegacyCheckpointSchema>;
type GetResponse = Awaited<ReturnType<NangoSyncLocal['get']>>;
type NormalizedCheckpoint = {
    phase: 'backfill' | 'history';
    history_id: string | undefined;
    page_token: string | undefined;
    backfill_history_id: string | undefined;
};

const EMPTY_BACKFILL_CHECKPOINT: NormalizedCheckpoint = {
    phase: 'backfill',
    history_id: undefined,
    page_token: undefined,
    backfill_history_id: undefined
};

const HistoryMessageSchema = z.object({
    id: z.string(),
    threadId: z.string(),
    labelIds: z.array(z.string()).optional(),
    historyId: z.string().optional()
});

const HistoryMessageAddedSchema = z.object({
    message: HistoryMessageSchema
});

const HistoryMessageDeletedSchema = z.object({
    message: HistoryMessageSchema
});

const HistoryLabelChangeSchema = z.object({
    message: HistoryMessageSchema,
    labelIds: z.array(z.string())
});

// https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history#History
const HistorySchema = z.object({
    id: z.string(),
    messages: z.array(HistoryMessageSchema).optional(),
    messagesAdded: z.array(HistoryMessageAddedSchema).optional(),
    messagesDeleted: z.array(HistoryMessageDeletedSchema).optional(),
    labelsAdded: z.array(HistoryLabelChangeSchema).optional(),
    labelsRemoved: z.array(HistoryLabelChangeSchema).optional()
});

const HistoryListResponseSchema = z.object({
    history: z.array(HistorySchema).optional(),
    nextPageToken: z.string().optional(),
    historyId: z.string().optional()
});

const ThreadListItemSchema = z.object({
    id: z.string(),
    historyId: z.string().optional(),
    snippet: z.string().optional()
});

const ThreadListResponseSchema = z.object({
    threads: z.array(ThreadListItemSchema).optional(),
    nextPageToken: z.string().optional(),
    resultSizeEstimate: z.number().optional()
});

const ProfileSchema = z.object({
    historyId: z.string()
});

const sync = createSync({
    description: 'Sync Gmail conversation threads with full message hydration',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    endpoints: [{ path: '/syncs/threads', method: 'POST' }],
    checkpoint: CheckpointSchema,
    models: {
        Thread: ThreadSchema
    },

    exec: async (nango) => {
        const checkpoint = normalizeCheckpoint(parseCheckpoint(await nango.getCheckpoint()));

        if (checkpoint.phase === 'history' && checkpoint.history_id) {
            await syncHistory(nango, checkpoint);
            return;
        }

        await syncBackfill(nango, checkpoint);
    }
});

function parseCheckpoint(checkpoint: unknown): Checkpoint | null {
    const parsed = LegacyCheckpointSchema.safeParse(checkpoint);
    return parsed.success ? parsed.data : null;
}

function normalizeCheckpoint(checkpoint: Checkpoint | null): NormalizedCheckpoint {
    if (!checkpoint) {
        return EMPTY_BACKFILL_CHECKPOINT;
    }

    if (checkpoint.phase === 'history' && checkpoint.history_id) {
        return {
            phase: 'history',
            history_id: checkpoint.history_id,
            page_token: checkpoint.page_token,
            backfill_history_id: undefined
        };
    }

    if (checkpoint.phase === 'backfill') {
        return {
            phase: 'backfill',
            history_id: undefined,
            page_token: checkpoint.page_token,
            backfill_history_id: checkpoint.backfill_history_id
        };
    }

    // Older checkpoints stored page_token during backfill without enough state
    // to replay missed history safely after the crawl completes.
    if (checkpoint.page_token) {
        return EMPTY_BACKFILL_CHECKPOINT;
    }

    if (checkpoint.history_id) {
        return {
            phase: 'history',
            history_id: checkpoint.history_id,
            page_token: undefined,
            backfill_history_id: undefined
        };
    }

    return EMPTY_BACKFILL_CHECKPOINT;
}

async function syncBackfill(nango: NangoSyncLocal, checkpoint: NormalizedCheckpoint): Promise<void> {
    const pageToken = checkpoint.phase === 'backfill' ? checkpoint.page_token : undefined;
    let backfillHistoryId = checkpoint.phase === 'backfill' ? checkpoint.backfill_history_id : undefined;

    if (!pageToken) {
        await nango.trackDeletesStart('Thread');
        backfillHistoryId = await getCurrentHistoryId(nango);
    } else if (!backfillHistoryId) {
        backfillHistoryId = await getCurrentHistoryId(nango);
    }

    // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/list
    const listResponse = await nango.get({
        endpoint: '/gmail/v1/users/me/threads',
        params: {
            maxResults: 50,
            ...(pageToken && { pageToken })
        },
        retries: 3
    });

    const listData = ThreadListResponseSchema.parse(listResponse.data);
    const threads: Array<z.infer<typeof ThreadSchema>> = [];

    for (const threadSummary of listData.threads ?? []) {
        const thread = await fetchThread(nango, threadSummary.id);
        if (thread) {
            threads.push(thread);
        }
    }

    if (threads.length > 0) {
        await nango.batchSave(threads, 'Thread');
    }

    if (listData.nextPageToken) {
        await nango.saveCheckpoint({
            phase: 'backfill',
            history_id: '',
            page_token: listData.nextPageToken,
            backfill_history_id: backfillHistoryId ?? ''
        });
        return;
    }

    await nango.trackDeletesEnd('Thread');

    await nango.saveCheckpoint({
        phase: 'history',
        history_id: backfillHistoryId ?? (await getCurrentHistoryId(nango)),
        page_token: '',
        backfill_history_id: ''
    });
}

async function syncHistory(nango: NangoSyncLocal, checkpoint: NormalizedCheckpoint): Promise<void> {
    const startHistoryId = checkpoint.history_id;
    if (!startHistoryId) {
        await syncBackfill(nango, EMPTY_BACKFILL_CHECKPOINT);
        return;
    }

    // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list
    let response: GetResponse;
    try {
        response = await nango.get({
            endpoint: '/gmail/v1/users/me/history',
            params: {
                startHistoryId,
                ...(checkpoint.page_token && { pageToken: checkpoint.page_token })
            },
            retries: 3
        });
    } catch (error) {
        if (isNotFoundError(error)) {
            await syncBackfill(nango, EMPTY_BACKFILL_CHECKPOINT);
            return;
        }

        throw error;
    }

    const historyData = HistoryListResponseSchema.parse(response.data);
    const threadIdsToRefresh = new Set<string>();

    for (const history of historyData.history ?? []) {
        for (const message of history.messages ?? []) {
            threadIdsToRefresh.add(message.threadId);
        }

        for (const added of history.messagesAdded ?? []) {
            threadIdsToRefresh.add(added.message.threadId);
        }

        for (const deleted of history.messagesDeleted ?? []) {
            threadIdsToRefresh.add(deleted.message.threadId);
        }

        for (const labelChange of history.labelsAdded ?? []) {
            threadIdsToRefresh.add(labelChange.message.threadId);
        }

        for (const labelChange of history.labelsRemoved ?? []) {
            threadIdsToRefresh.add(labelChange.message.threadId);
        }
    }

    const threads: Array<z.infer<typeof ThreadSchema>> = [];
    const threadIdsToDelete = new Set<string>();

    for (const threadId of threadIdsToRefresh) {
        const thread = await fetchThread(nango, threadId);
        if (thread) {
            threads.push(thread);
            continue;
        }

        threadIdsToDelete.add(threadId);
    }

    if (threads.length > 0) {
        await nango.batchSave(threads, 'Thread');
    }

    if (threadIdsToDelete.size > 0) {
        await nango.batchDelete(
            Array.from(threadIdsToDelete).map((id) => ({ id })),
            'Thread'
        );
    }

    if (historyData.nextPageToken) {
        await nango.saveCheckpoint({
            phase: 'history',
            history_id: startHistoryId,
            page_token: historyData.nextPageToken,
            backfill_history_id: ''
        });
        return;
    }

    await nango.saveCheckpoint({
        phase: 'history',
        history_id: historyData.historyId ?? startHistoryId,
        page_token: '',
        backfill_history_id: ''
    });
}

async function getCurrentHistoryId(nango: NangoSyncLocal): Promise<string> {
    // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/getProfile
    const profileResponse = await nango.get({
        endpoint: '/gmail/v1/users/me/profile',
        retries: 3
    });

    return ProfileSchema.parse(profileResponse.data).historyId;
}

async function fetchThread(nango: NangoSyncLocal, threadId: string): Promise<z.infer<typeof ThreadSchema> | null> {
    // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/get
    let response: GetResponse;
    try {
        response = await nango.get({
            endpoint: `/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}`,
            params: {
                format: 'metadata'
            },
            retries: 3
        });
    } catch (error) {
        if (isNotFoundError(error)) {
            return null;
        }

        throw error;
    }

    return ThreadSchema.parse(response.data);
}

function isNotFoundError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const status = 'status' in error ? error.status : undefined;
    if (status === 404) {
        return true;
    }

    const payload = 'payload' in error ? error.payload : undefined;
    if (!payload || typeof payload !== 'object') {
        return false;
    }

    const nestedError = 'error' in payload ? payload.error : undefined;
    if (!nestedError || typeof nestedError !== 'object') {
        return false;
    }

    return 'code' in nestedError && nestedError.code === 404;
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
