import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    bucket_id: z.string().describe('The bucket ID. Example: "nango-test-public"'),
    path: z.string().describe('The object path within the bucket. Example: "docs/readme.txt"'),
    content: z.string().describe('The file content as a string. For binary files, base64-encode and decode before sending.'),
    content_type: z.string().describe('The MIME type of the file. Example: "text/plain"'),
    upsert: z.boolean().optional().describe('If true, overwrite an existing object with the same path.')
});

const ProviderResponseSchema = z.object({
    Key: z.string(),
    Id: z.string()
});

const OutputSchema = z.object({
    key: z.string(),
    id: z.string()
});

const action = createAction({
    description: 'Upload a storage object to Supabase Storage.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-storage-object',
        group: 'Storage'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config;
        const projectUrl =
            connectionConfig !== null &&
            typeof connectionConfig === 'object' &&
            'projectUrl' in connectionConfig &&
            typeof connectionConfig['projectUrl'] === 'string'
                ? connectionConfig['projectUrl']
                : undefined;
        const baseUrlOverride = projectUrl?.startsWith('http') ? projectUrl : undefined;

        const response = await nango.post({
            // https://supabase.com/docs/reference/api/storage
            endpoint: `/storage/v1/object/${encodeURIComponent(input.bucket_id)}/${encodeURIComponent(input.path)}`,
            baseUrlOverride,
            data: input.content,
            headers: {
                'Content-Type': input.content_type,
                ...(input.upsert && { 'x-upsert': 'true' })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            key: providerResponse.Key,
            id: providerResponse.Id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
