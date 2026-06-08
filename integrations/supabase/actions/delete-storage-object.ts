import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    bucketId: z.string().describe('Storage bucket ID. Example: "nango-test-public"'),
    prefixes: z.array(z.string()).min(1).describe('Object paths to delete. Example: ["delete-me-1.txt"]')
});

const DeletedObjectSchema = z
    .object({
        name: z.string(),
        id: z.string().optional(),
        bucket_id: z.string().optional(),
        owner: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        last_accessed_at: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        path_tokens: z.array(z.string()).optional(),
        version: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    deleted: z.array(DeletedObjectSchema)
});

const action = createAction({
    description: 'Delete or archive a storage object in Supabase.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-storage-object',
        group: 'Storage'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config;
        const projectUrl =
            typeof connectionConfig === 'object' && connectionConfig !== null && 'projectUrl' in connectionConfig ? connectionConfig['projectUrl'] : undefined;
        const baseUrlOverride = typeof projectUrl === 'string' && projectUrl.startsWith('http') ? projectUrl : undefined;

        // https://supabase.com/docs/reference/api
        const response = await nango.delete({
            endpoint: `/storage/v1/object/${encodeURIComponent(input.bucketId)}`,
            data: {
                prefixes: input.prefixes
            },
            baseUrlOverride,
            retries: 3
        });

        const parsed = z.array(DeletedObjectSchema).parse(response.data);

        return {
            deleted: parsed
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
