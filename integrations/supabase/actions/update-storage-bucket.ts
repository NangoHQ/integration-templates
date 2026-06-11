import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Bucket ID. Example: "nango-test-public"'),
    public: z.boolean().optional().describe('Whether the bucket is publicly accessible'),
    fileSizeLimit: z.union([z.number(), z.string()]).nullable().optional().describe('Maximum file size in bytes or as a string like "100MB"'),
    allowedMimeTypes: z.array(z.string()).nullable().optional().describe('Allowed MIME types. Example: ["image/png", "image/jpg"]')
});

const ProviderResponseSchema = z.object({
    message: z.string()
});

const OutputSchema = z.object({
    message: z.string()
});

const action = createAction({
    description: 'Update a storage bucket in Supabase.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-storage-bucket',
        group: 'Storage'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config;
        let projectUrl: unknown;
        if (typeof connectionConfig === 'object' && connectionConfig !== null && 'projectUrl' in connectionConfig) {
            projectUrl = connectionConfig['projectUrl'];
        }
        const baseUrlOverride = typeof projectUrl === 'string' ? (projectUrl.startsWith('http') ? projectUrl : `https://${projectUrl}`) : undefined;

        const data: Record<string, unknown> = {};
        if (input.public !== undefined) {
            data['public'] = input.public;
        }
        if (input.fileSizeLimit !== undefined) {
            data['file_size_limit'] = input.fileSizeLimit;
        }
        if (input.allowedMimeTypes !== undefined) {
            data['allowed_mime_types'] = input.allowedMimeTypes;
        }

        if (Object.keys(data).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one field to update must be provided.'
            });
        }

        const response = await nango.put({
            // https://supabase.com/docs/reference/api
            endpoint: `/storage/v1/bucket/${encodeURIComponent(input.id)}`,
            data,
            baseUrlOverride,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
