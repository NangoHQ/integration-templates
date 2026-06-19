import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    bucket_id: z.string().describe('Storage bucket ID. Example: "nango-test-public"'),
    path: z.string().describe('Object path within the bucket. Example: "uploads/file.txt"')
});

const ProviderResponseSchema = z.object({
    url: z.string(),
    token: z.string()
});

const OutputSchema = z.object({
    signed_url: z.string().describe('Absolute signed URL the client can PUT to.'),
    token: z.string().describe('Token included in the signed URL.')
});

const action = createAction({
    description: 'Generate a signed URL that allows a client to upload a file directly to Supabase Storage without exposing the service role key.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const rawProjectUrl = connection.connection_config?.['projectUrl'];
        const projectUrl =
            typeof rawProjectUrl === 'string' && rawProjectUrl.length > 0
                ? rawProjectUrl.startsWith('http')
                    ? rawProjectUrl
                    : `https://${rawProjectUrl}`
                : undefined;
        const baseUrlOverride = projectUrl;

        if (!baseUrlOverride) {
            throw new nango.ActionError({
                type: 'missing_project_url',
                message: 'projectUrl is missing from connection configuration.'
            });
        }

        const response = await nango.post({
            // https://supabase.com/docs/reference/api/storage-createuploadsignedurl
            endpoint: `/storage/v1/object/upload/sign/${encodeURIComponent(input.bucket_id)}/${encodeURIComponent(input.path)}`,
            data: {
                upsert: true
            },
            baseUrlOverride,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);
        const signedUrl = `${baseUrlOverride}/storage/v1${providerData.url}`;

        return {
            signed_url: signedUrl,
            token: providerData.token
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
