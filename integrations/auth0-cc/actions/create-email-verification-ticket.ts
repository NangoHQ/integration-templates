import { z } from 'zod';
import { createAction } from 'nango';

const IdentitySchema = z.object({
    user_id: z.string().describe('User ID of the identity to be verified. Example: "5457edea1b8f22891a000004"'),
    provider: z.string().describe('Identity provider name of the identity (e.g. "google-oauth2").'),
    connection_id: z.string().optional().describe('Connection ID of the identity. Example: "con_1234567890abcdef"')
});

const InputSchema = z.object({
    user_id: z.string().describe('User ID for whom the ticket should be created. Example: "auth0|1234567890abcdef"'),
    result_url: z.string().optional().describe('URL the user will be redirected to once the ticket is used.'),
    client_id: z.string().optional().describe('ID of the client (application).'),
    organization_id: z.string().optional().describe('Organization ID.'),
    ttl_sec: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Number of seconds for which the ticket is valid before expiration. Defaults to 432000 seconds (5 days).'),
    includeEmailInRedirect: z.boolean().optional().describe('Whether to include the email address as part of the returnUrl in the reset_email.'),
    identity: IdentitySchema.optional().describe('Identity to be verified. Required for social, enterprise and passwordless email identities.')
});

const ProviderOutputSchema = z.object({
    ticket: z.string()
});

const OutputSchema = z.object({
    ticket: z.string().describe('URL representing the ticket.')
});

const action = createAction({
    description: 'Create an Auth0 email verification ticket.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['create:user_tickets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://auth0.com/docs/api/management/v2/tickets/post-email-verification
            endpoint: '/api/v2/tickets/email-verification',
            data: {
                user_id: input.user_id,
                ...(input.result_url !== undefined && { result_url: input.result_url }),
                ...(input.client_id !== undefined && { client_id: input.client_id }),
                ...(input.organization_id !== undefined && { organization_id: input.organization_id }),
                ...(input.ttl_sec !== undefined && { ttl_sec: input.ttl_sec }),
                ...(input.includeEmailInRedirect !== undefined && { includeEmailInRedirect: input.includeEmailInRedirect }),
                ...(input.identity !== undefined && { identity: input.identity })
            },
            retries: 3
        });

        const providerOutput = ProviderOutputSchema.parse(response.data);

        return {
            ticket: providerOutput.ticket
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
