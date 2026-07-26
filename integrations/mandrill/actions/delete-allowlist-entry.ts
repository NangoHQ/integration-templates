import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('The email address to remove from the allowlist. Example: "user@example.com"')
});

const ProviderResponseSchema = z.object({
    email: z.string(),
    deleted: z.boolean()
});

const OutputSchema = z.object({
    email: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Remove an email address from the rejection allowlist.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['transactional'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/allowlists/remove-email-from-allowlist/
            endpoint: '1.0/allowlists/delete.json',
            data: {
                email: input.email
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            email: providerResponse.email,
            deleted: providerResponse.deleted
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
