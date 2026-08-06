import { createSync } from 'nango';
import { z } from 'zod';

const ProviderRequestSchema = z.object({
    request_id: z.string(),
    request_type: z.string().optional(),
    state: z.string().optional(),
    user_identifier: z.string().optional(),
    files_count: z.string().optional(),
    created_at: z.string().optional(),
    failed_reason: z.string().optional()
});

const DataRequestSchema = z.object({
    id: z.string(),
    request_id: z.string().optional(),
    request_type: z.string().optional(),
    state: z.string().optional(),
    user_identifier: z.string().optional(),
    files_count: z.number().int().optional(),
    created_at: z.string().optional(),
    failed_reason: z.string().optional()
});

const ProviderResponseSchema = z.object({
    records: z.array(ProviderRequestSchema),
    next_page_token: z.string().optional()
});

const CheckpointSchema = z.object({
    next_page_token: z.string()
});

const sync = createSync({
    description: 'Sync the history of data export/deletion requests filed on this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        DataRequest: DataRequestSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = checkpoint == null ? null : CheckpointSchema.safeParse(checkpoint);
        if (parsedCheckpoint && !parsedCheckpoint.success) {
            throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
        }

        // Blocker: provider only exposes GET /v2/data_requests/requests with no
        // changed-since filter or deleted-record endpoint, so this remains a
        // full refresh. We only checkpoint the pagination token to resume an
        // interrupted run instead of restarting from page 1.
        let nextPageToken = parsedCheckpoint?.success ? parsedCheckpoint.data.next_page_token : undefined;

        if (!nextPageToken) {
            await nango.trackDeletesStart('DataRequest');
        }

        while (true) {
            // https://developers.zoom.us/docs/api/
            const response = await nango.get({
                endpoint: '/v2/data_requests/requests',
                params: {
                    page_size: 30,
                    ...(nextPageToken ? { next_page_token: nextPageToken } : {})
                },
                retries: 3
            });

            const parsedResponse = ProviderResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Failed to parse data requests response: ${parsedResponse.error.message}`);
            }

            const records = [];
            for (const parsed of parsedResponse.data.records) {
                records.push({
                    id: parsed.request_id,
                    request_id: parsed.request_id,
                    request_type: parsed.request_type,
                    state: parsed.state,
                    user_identifier: parsed.user_identifier,
                    files_count: parsed.files_count != null ? Number(parsed.files_count) : undefined,
                    created_at: parsed.created_at,
                    failed_reason: parsed.failed_reason
                });
            }

            if (records.length > 0) {
                await nango.batchSave(records, 'DataRequest');
            }

            nextPageToken = parsedResponse.data.next_page_token;

            if (!nextPageToken) {
                break;
            }

            await nango.saveCheckpoint({
                next_page_token: nextPageToken
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('DataRequest');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
