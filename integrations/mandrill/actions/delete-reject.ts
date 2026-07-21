import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('The email address to remove from the rejection denylist. Example: "user@example.com"'),
    subaccount: z.string().optional().describe('An optional unique identifier for the subaccount to limit the deletion. Example: "cust-123"')
});

const ProviderResponseSchema = z.object({
    email: z.string(),
    deleted: z.boolean(),
    subaccount: z.string().nullable().optional()
});

const OutputSchema = z.object({
    email: z.string(),
    deleted: z.boolean(),
    subaccount: z.string().optional()
});

const action = createAction({
    description: 'Remove an email address from the rejection denylist.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/rejects/delete-email-from-denylist/
            endpoint: '1.0/rejects/delete',
            data: {
                email: input.email,
                ...(input.subaccount !== undefined && { subaccount: input.subaccount })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            email: providerResponse.email,
            deleted: providerResponse.deleted,
            ...(providerResponse.subaccount != null && { subaccount: providerResponse.subaccount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
