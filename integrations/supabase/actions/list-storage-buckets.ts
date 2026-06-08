import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    limit: z.number().min(1).optional().describe('Maximum number of buckets to return. Example: 10'),
    offset: z.number().min(0).optional().describe('Number of buckets to skip. Example: 0'),
    sort_column: z.enum(['id', 'name', 'created_at', 'updated_at']).optional().describe('Column to sort by. Example: "created_at"'),
    sort_order: z.enum(['asc', 'desc']).optional().describe('Sort direction. Example: "desc"'),
    search: z.string().optional().describe('Search term to filter bucket names. Example: "prod"')
});

const BucketSchema = z.object({
    id: z.string(),
    name: z.string(),
    public: z.boolean(),
    owner: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    file_size_limit: z.number().optional().nullable(),
    allowed_mime_types: z.array(z.string()).optional().nullable(),
    type: z.string().optional().nullable()
});

const OutputSchema = z.object({
    items: z.array(BucketSchema),
    next_offset: z.number().optional()
});

const ConnectionConfigSchema = z.object({
    projectUrl: z.string().optional()
});

const action = createAction({
    description: 'List storage buckets from Supabase.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-storage-buckets'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const configResult = ConnectionConfigSchema.safeParse(connection.connection_config);
        const projectUrl = configResult.success ? configResult.data.projectUrl : undefined;
        const baseUrlOverride = projectUrl ? (projectUrl.startsWith('http') ? projectUrl : `https://${projectUrl}`) : undefined;

        const response = await nango.get({
            // https://supabase.com/docs/reference/api/storage-list-buckets
            endpoint: '/storage/v1/bucket',
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.offset !== undefined && { offset: String(input.offset) }),
                ...(input.sort_column !== undefined && { sortColumn: input.sort_column }),
                ...(input.sort_order !== undefined && { sortOrder: input.sort_order }),
                ...(input.search !== undefined && { search: input.search })
            },
            baseUrlOverride,
            retries: 3
        });

        const providerBuckets = z.array(z.unknown()).parse(response.data);

        const items = providerBuckets.map((bucket) => {
            const parsed = BucketSchema.parse(bucket);
            return {
                id: parsed.id,
                name: parsed.name,
                public: parsed.public,
                ...(parsed.owner != null && { owner: parsed.owner }),
                ...(parsed.created_at != null && { created_at: parsed.created_at }),
                ...(parsed.updated_at != null && { updated_at: parsed.updated_at }),
                ...(parsed.file_size_limit != null && { file_size_limit: parsed.file_size_limit }),
                ...(parsed.allowed_mime_types != null && { allowed_mime_types: parsed.allowed_mime_types }),
                ...(parsed.type != null && { type: parsed.type })
            };
        });

        const nextOffset = input.limit !== undefined && providerBuckets.length >= input.limit ? (input.offset || 0) + input.limit : undefined;

        return {
            items,
            ...(nextOffset !== undefined && { next_offset: nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
