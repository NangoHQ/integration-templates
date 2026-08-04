import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('The connected user\'s id. Example: "cmseows7p000fk604g3qee8bs"'),
    recipient_id: z.string().describe('The recipient id. Example: "wrec_2deeccd030ecff23b947b1cf"')
});

const ProviderResponseSchema = z.object({
    removed: z.boolean()
});

const OutputSchema = z.object({
    removed: z.boolean()
});

const action = createAction({
    description: 'Soft-remove a saved bank destination.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://docs.agentcard.sh/companies/api/reference/wallet-withdrawal-recipient-delete.md
            endpoint: `/api/v2/wallet/withdrawal-recipients/${encodeURIComponent(input.recipient_id)}`,
            params: {
                user_id: input.user_id
            },
            retries: 3
        };

        const response = await nango.delete(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            removed: providerResponse.removed
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
