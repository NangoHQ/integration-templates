import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderBucketSchema = z.object({
    id: z.string(),
    name: z.string(),
    public: z.boolean(),
    owner: z.string(),
    file_size_limit: z.number().optional().nullable(),
    allowed_mime_types: z.array(z.string()).optional().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    type: z.string().optional().nullable()
});

const BucketSchema = z.object({
    id: z.string(),
    name: z.string(),
    public: z.boolean(),
    owner: z.string(),
    file_size_limit: z.number().optional().nullable(),
    allowed_mime_types: z.array(z.string()).optional().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    type: z.string().optional().nullable()
});

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync storage buckets from Supabase',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Bucket: BucketSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/storage-buckets'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const connection = await nango.getConnection();
        let projectUrl: string | undefined;
        if (
            typeof connection.connection_config === 'object' &&
            connection.connection_config !== null &&
            'projectUrl' in connection.connection_config &&
            typeof connection.connection_config['projectUrl'] === 'string'
        ) {
            projectUrl = connection.connection_config['projectUrl'];
        }
        const baseUrlOverride = typeof projectUrl === 'string' && projectUrl.startsWith('http') ? projectUrl : undefined;
        let nextOffset = checkpoint?.offset ?? 0;

        // Blocker: GET /storage/v1/bucket supports limit, offset, sortColumn, sortOrder, and search
        // but does not expose an updated_after filter, cursor, or changed-records endpoint.
        // Use an offset checkpoint only to resume a full refresh safely across interruptions.
        await nango.trackDeletesStart('Bucket');

        const proxyConfig: ProxyConfiguration = {
            // https://supabase.com/docs/reference/api
            endpoint: '/storage/v1/bucket',
            baseUrlOverride,
            params: {
                sortColumn: 'updated_at',
                sortOrder: 'asc'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: nextOffset,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam, response }) => {
                    nextOffset = typeof nextPageParam === 'number' ? nextPageParam : nextOffset + (Array.isArray(response.data) ? response.data.length : 0);
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const pageValidation = z.array(z.unknown()).safeParse(page);
            if (!pageValidation.success) {
                throw new Error(`Failed to validate page response: ${pageValidation.error.message}`);
            }

            const buckets = [];
            for (const raw of pageValidation.data) {
                const parsed = ProviderBucketSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse bucket record: ${parsed.error.message}`);
                }
                buckets.push({
                    id: parsed.data.id,
                    name: parsed.data.name,
                    public: parsed.data.public,
                    owner: parsed.data.owner,
                    created_at: parsed.data.created_at,
                    updated_at: parsed.data.updated_at,
                    ...(parsed.data.file_size_limit != null && {
                        file_size_limit: parsed.data.file_size_limit
                    }),
                    ...(parsed.data.allowed_mime_types != null && {
                        allowed_mime_types: parsed.data.allowed_mime_types
                    }),
                    ...(parsed.data.type != null && { type: parsed.data.type })
                });
            }

            if (buckets.length > 0) {
                await nango.batchSave(buckets, 'Bucket');
            }

            await nango.saveCheckpoint({ offset: nextOffset });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Bucket');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
