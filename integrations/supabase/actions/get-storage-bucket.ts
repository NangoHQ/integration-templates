import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    bucketId: z.string().describe('Storage bucket ID. Example: "nango-test-public"')
});

const ProviderBucketSchema = z.object({
    id: z.string(),
    name: z.string(),
    owner: z.string().optional(),
    owner_id: z.string().optional(),
    public: z.boolean(),
    type: z.enum(['STANDARD', 'ANALYTICS']).optional(),
    file_size_limit: z.number().nullable().optional(),
    allowed_mime_types: z.array(z.string()).nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    owner: z.string().optional(),
    owner_id: z.string().optional(),
    public: z.boolean(),
    type: z.enum(['STANDARD', 'ANALYTICS']).optional(),
    file_size_limit: z.number().nullable().optional(),
    allowed_mime_types: z.array(z.string()).nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single storage bucket from Supabase.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-storage-bucket',
        group: 'Storage'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfigSchema = z.object({
            projectUrl: z.string().optional()
        });
        const connectionConfig = connectionConfigSchema.parse(connection.connection_config || {});
        const projectUrl = connectionConfig.projectUrl;
        const baseUrlOverride = projectUrl?.startsWith('http') ? projectUrl : undefined;

        const response = await nango.get({
            // https://supabase.com/docs/reference/api
            endpoint: `/storage/v1/bucket/${encodeURIComponent(input.bucketId)}`,
            baseUrlOverride,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Bucket not found: ${input.bucketId}`
            });
        }

        const bucket = ProviderBucketSchema.parse(response.data);

        return {
            id: bucket.id,
            name: bucket.name,
            ...(bucket.owner !== undefined && { owner: bucket.owner }),
            ...(bucket.owner_id !== undefined && { owner_id: bucket.owner_id }),
            public: bucket.public,
            ...(bucket.type !== undefined && { type: bucket.type }),
            ...(bucket.file_size_limit !== undefined && { file_size_limit: bucket.file_size_limit }),
            ...(bucket.allowed_mime_types !== undefined && { allowed_mime_types: bucket.allowed_mime_types }),
            ...(bucket.created_at !== undefined && { created_at: bucket.created_at }),
            ...(bucket.updated_at !== undefined && { updated_at: bucket.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
