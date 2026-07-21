import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('The email address to add to the rejection denylist. Example: "user@example.com"'),
    comment: z.string().optional().describe('An optional comment describing the rejection'),
    subaccount: z.string().optional().describe('An optional unique identifier for the subaccount to limit the denylist entry')
});

const ProviderResponseSchema = z.object({
    email: z.string(),
    added: z.boolean()
});

const OutputSchema = z.object({
    email: z.string(),
    added: z.boolean()
});

const action = createAction({
    description: 'Add an email address to the rejection denylist.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://mailchimp.com/developer/transactional/api/rejects/add-reject/
        const response = await nango.post({
            endpoint: 'rejects/add.json',
            baseUrlOverride: 'https://mandrillapp.com/api/1.0',
            data: {
                email: input.email,
                ...(input.comment !== undefined && { comment: input.comment }),
                ...(input.subaccount !== undefined && { subaccount: input.subaccount })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            email: providerResponse.email,
            added: providerResponse.added
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
