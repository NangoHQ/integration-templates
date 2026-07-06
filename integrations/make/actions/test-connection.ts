import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    connectionId: z.number().describe('The ID of the connection to test. Example: 8708889')
});

const ProviderResponseSchema = z.object({
    verified: z.boolean()
});

const OutputSchema = z.object({
    verified: z.boolean(),
    connection: z.unknown().optional()
});

const action = createAction({
    description: "Verify that a connection's saved credentials are still valid.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['connections:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.make.com/api-documentation/api-reference/connections
        const response = await nango.post({
            endpoint: `/connections/${encodeURIComponent(input.connectionId)}/test`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            verified: providerResponse.verified,
            ...(response.data && typeof response.data === 'object' && 'connection' in response.data && { connection: response.data.connection })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
