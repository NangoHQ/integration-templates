import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    refresh_token: z.string().describe('The refresh token from the most recent verify or refresh call. Example: "rct_4d5e6f…"')
});

const ProviderResponseSchema = z.object({
    object: z.literal('connection'),
    access_token: z.string(),
    refresh_token: z.string(),
    token_type: z.literal('Bearer'),
    expires_in: z.number().int()
});

const OutputSchema = z.object({
    object: z.literal('connection'),
    access_token: z.string().describe('The new connection access token.'),
    refresh_token: z.string().describe('The new refresh token. The old one is now invalid — replace the stored token every time.'),
    token_type: z.literal('Bearer'),
    expires_in: z.number().int().describe('Seconds until the access token expires (3600 = one hour).')
});

const action = createAction({
    description: "Exchange a connected user's refresh token for a new access/refresh token pair before the access token expires.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.agentcard.sh/api-reference/connect/refresh-token
            endpoint: '/api/v2/connect/refresh',
            data: {
                refresh_token: input.refresh_token
            },
            retries: 10
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            object: parsed.object,
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token,
            token_type: parsed.token_type,
            expires_in: parsed.expires_in
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
