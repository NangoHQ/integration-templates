import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderFileSchema = z.object({
    file_id: z.string(),
    file_name: z.string().optional(),
    status: z.string().optional(),
    unique_emails: z.number().optional(),
    updated_at: z.string(),
    createdate: z.string().optional(),
    percent: z.number().optional(),
    total_rows: z.number().optional(),
    verified: z.number().optional(),
    unverified: z.number().optional(),
    ok: z.number().optional(),
    catch_all: z.number().optional(),
    disposable: z.number().optional(),
    invalid: z.number().optional(),
    unknown: z.number().optional(),
    reverify: z.number().optional(),
    credit: z.number().optional(),
    estimated_time_sec: z.number().optional(),
    error: z.string().optional()
});

const BulkFileSchema = z.object({
    id: z.string(),
    file_id: z.string(),
    file_name: z.string().optional(),
    status: z.string().optional(),
    unique_emails: z.number().optional(),
    updated_at: z.string(),
    createdate: z.string().optional(),
    percent: z.number().optional(),
    total_rows: z.number().optional(),
    verified: z.number().optional(),
    unverified: z.number().optional(),
    ok: z.number().optional(),
    catch_all: z.number().optional(),
    disposable: z.number().optional(),
    invalid: z.number().optional(),
    unknown: z.number().optional(),
    reverify: z.number().optional(),
    credit: z.number().optional(),
    estimated_time_sec: z.number().optional(),
    error: z.string().optional()
});

const ConnectionSchema = z
    .object({
        credentials: z
            .object({
                type: z.literal('API_KEY'),
                apiKey: z.string()
            })
            .passthrough()
    })
    .passthrough();

const sync = createSync({
    description: 'Sync uploaded bulk verification file records (job history).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        BulkFile: BulkFileSchema
    },

    exec: async (nango) => {
        const connection = ConnectionSchema.parse(await nango.getConnection());
        const apiKey = connection.credentials.apiKey;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.millionverifier.com/#operation/bulk-filelist
            endpoint: '/bulkapi/v2/filelist',
            baseUrlOverride: 'https://bulkapi.millionverifier.com',
            params: {
                key: apiKey
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                limit_name_in_request: 'limit',
                limit: 50,
                response_path: 'files'
            },
            retries: 3
        };

        // MillionVerifier's filelist endpoint has no incremental delta or deletion feed,
        // so every run re-enumerates the full list and relies on trackDeletes to reconcile removals.
        await nango.trackDeletesStart('BulkFile');

        for await (const page of nango.paginate(proxyConfig)) {
            const records = z.array(ProviderFileSchema).parse(page);

            const files = records.map((record) => ({
                id: record.file_id,
                file_id: record.file_id,
                ...(record.file_name !== undefined && { file_name: record.file_name }),
                ...(record.status !== undefined && { status: record.status }),
                ...(record.unique_emails !== undefined && { unique_emails: record.unique_emails }),
                updated_at: record.updated_at,
                ...(record.createdate !== undefined && { createdate: record.createdate }),
                ...(record.percent !== undefined && { percent: record.percent }),
                ...(record.total_rows !== undefined && { total_rows: record.total_rows }),
                ...(record.verified !== undefined && { verified: record.verified }),
                ...(record.unverified !== undefined && { unverified: record.unverified }),
                ...(record.ok !== undefined && { ok: record.ok }),
                ...(record.catch_all !== undefined && { catch_all: record.catch_all }),
                ...(record.disposable !== undefined && { disposable: record.disposable }),
                ...(record.invalid !== undefined && { invalid: record.invalid }),
                ...(record.unknown !== undefined && { unknown: record.unknown }),
                ...(record.reverify !== undefined && { reverify: record.reverify }),
                ...(record.credit !== undefined && { credit: record.credit }),
                ...(record.estimated_time_sec !== undefined && { estimated_time_sec: record.estimated_time_sec }),
                ...(record.error !== undefined && { error: record.error })
            }));

            if (files.length === 0) {
                continue;
            }

            await nango.batchSave(files, 'BulkFile');
        }

        await nango.trackDeletesEnd('BulkFile');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
