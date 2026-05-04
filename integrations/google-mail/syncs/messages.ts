import { createSync } from 'nango';
import { z } from 'zod';

// Gmail Message model - using z.unknown() for complex nested payload
const MessageSchema = z.object({
    id: z.string(),
    threadId: z.string(),
    labelIds: z.array(z.string()).optional(),
    snippet: z.string().optional(),
    historyId: z.string(),
    internalDate: z.string(),
    payload: z.unknown().optional(),
    sizeEstimate: z.number().optional()
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

// Provider response schemas
const MessageListItemSchema = z.object({
    id: z.string(),
    threadId: z.string(),
    labelIds: z.array(z.string()).optional(),
    historyId: z.string().optional()
});

const MessageListResponseSchema = z.object({
    messages: z.array(MessageListItemSchema).optional(),
    nextPageToken: z.string().optional(),
    resultSizeEstimate: z.number().optional()
});

const HistoryMessageAddedSchema = z.object({
    message: MessageListItemSchema
});

const HistoryMessageDeletedSchema = z.object({
    message: MessageListItemSchema
});

const HistoryLabelChangeSchema = z.object({
    message: MessageListItemSchema,
    labelIds: z.array(z.string())
});

const HistoryRecordSchema = z.object({
    id: z.string(),
    messages: z.array(MessageListItemSchema).optional(),
    messagesAdded: z.array(HistoryMessageAddedSchema).optional(),
    messagesDeleted: z.array(HistoryMessageDeletedSchema).optional(),
    labelsAdded: z.array(HistoryLabelChangeSchema).optional(),
    labelsRemoved: z.array(HistoryLabelChangeSchema).optional()
});

const HistoryListResponseSchema = z.object({
    history: z.array(HistoryRecordSchema).optional(),
    nextPageToken: z.string().optional(),
    historyId: z.string().optional()
});

const ProfileSchema = z.object({
    historyId: z.string()
});

const sync = createSync({
    description: 'Sync Gmail messages with an initial backfill followed by history-based incremental updates.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Message: MessageSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/messages'
        }
    ],

    exec: async (nango) => {
        const checkpoint = normalizeCheckpoint(parseCheckpoint(await nango.getCheckpoint()));

        if (checkpoint.phase === 'history' && checkpoint.history_id) {
            await syncIncremental(nango, checkpoint);
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

    // Older checkpoints stored only page_token during backfill, which is not
    // enough to replay mailbox history safely after the crawl completes.
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

    if (!backfillHistoryId) {
        backfillHistoryId = await getCurrentHistoryId(nango);
    }

    if (!pageToken) {
        await nango.trackDeletesStart('Message');
    }

    // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list
    const listResponse = await nango.get({
        endpoint: '/gmail/v1/users/me/messages',
        params: {
            maxResults: 100,
            ...(pageToken && { pageToken })
        },
        retries: 3
    });

    const listData = MessageListResponseSchema.parse(listResponse.data);

    const messages: z.infer<typeof MessageSchema>[] = [];
    for (const messageRef of listData.messages ?? []) {
        const message = await fetchMessage(nango, messageRef.id);
        if (message) {
            messages.push(message);
        }
    }

    if (messages.length > 0) {
        await nango.batchSave(messages, 'Message');
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

    await nango.trackDeletesEnd('Message');

    await nango.saveCheckpoint({
        phase: 'history',
        history_id: backfillHistoryId ?? (await getCurrentHistoryId(nango)),
        page_token: '',
        backfill_history_id: ''
    });
}

async function syncIncremental(nango: NangoSyncLocal, checkpoint: NormalizedCheckpoint): Promise<void> {
    const startHistoryId = checkpoint.history_id;
    if (!startHistoryId) {
        await syncBackfill(nango, EMPTY_BACKFILL_CHECKPOINT);
        return;
    }

    // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list
    let historyResponse: GetResponse;
    try {
        historyResponse = await nango.get({
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

    const historyData = HistoryListResponseSchema.parse(historyResponse.data);
    const messageIdsToRefresh = new Set<string>();
    const messageIdsToDelete = new Set<string>();

    for (const record of historyData.history ?? []) {
        for (const message of record.messages ?? []) {
            messageIdsToRefresh.add(message.id);
        }

        for (const added of record.messagesAdded ?? []) {
            messageIdsToRefresh.add(added.message.id);
        }

        for (const labelChange of record.labelsAdded ?? []) {
            messageIdsToRefresh.add(labelChange.message.id);
        }

        for (const labelChange of record.labelsRemoved ?? []) {
            messageIdsToRefresh.add(labelChange.message.id);
        }

        for (const deleted of record.messagesDeleted ?? []) {
            messageIdsToDelete.add(deleted.message.id);
            messageIdsToRefresh.delete(deleted.message.id);
        }
    }

    const messagesToSave: z.infer<typeof MessageSchema>[] = [];
    for (const messageId of messageIdsToRefresh) {
        const message = await fetchMessage(nango, messageId);
        if (message) {
            messagesToSave.push(message);
            continue;
        }

        messageIdsToDelete.add(messageId);
    }

    if (messagesToSave.length > 0) {
        await nango.batchSave(messagesToSave, 'Message');
    }

    if (messageIdsToDelete.size > 0) {
        await nango.batchDelete(
            Array.from(messageIdsToDelete).map((id) => ({ id })),
            'Message'
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

async function fetchMessage(nango: NangoSyncLocal, messageId: string): Promise<z.infer<typeof MessageSchema> | null> {
    // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get
    let messageResponse: GetResponse;
    try {
        messageResponse = await nango.get({
            endpoint: `/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}`,
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

    return MessageSchema.parse(messageResponse.data);
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
