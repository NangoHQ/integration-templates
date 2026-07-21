import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().email().describe('Email address to add to the allowlist. Example: "user@example.com"'),
    comment: z.string().optional().describe('Optional description of why the email was added to the allowlist.')
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
    description: 'Add an email address to the rejection allowlist.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/allowlists/add-email-to-allowlist/
            endpoint: '1.0/allowlists/add.json',
            data: {
                email: input.email,
                ...(input.comment !== undefined && { comment: input.comment })
            },
            retries: 10
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
