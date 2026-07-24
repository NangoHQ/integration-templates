import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The ID of the bulk file to delete. Example: "12345"')
});

const ProviderResponseSchema = z
    .object({
        error: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Remove an uploaded bulk file from the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const credentials = connection.credentials;
        const rawApiKey = credentials && typeof credentials === 'object' && 'apiKey' in credentials ? credentials.apiKey : undefined;
        const apiKey = typeof rawApiKey === 'string' ? rawApiKey : undefined;

        if (!apiKey) {
            throw new nango.ActionError({
                type: 'missing_credentials',
                message: 'API key is missing from the connection.'
            });
        }

        // https://developer.millionverifier.com/
        const response = await nango.get({
            endpoint: '/bulkapi/v2/delete',
            params: {
                key: apiKey,
                file_id: input.file_id
            },
            baseUrlOverride: 'https://bulkapi.millionverifier.com',
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (parsed.success && parsed.data.error) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.data.error,
                file_id: input.file_id
            });
        }

        return {
            success: true,
            message: 'Bulk file deleted successfully.'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
