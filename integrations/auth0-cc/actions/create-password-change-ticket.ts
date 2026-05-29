import { z } from 'zod';
import { createAction } from 'nango';

const IdentitySchema = z.object({
    user_id: z.string(),
    provider: z.string(),
    connection_id: z.string().optional()
});

const InputSchema = z.object({
    result_url: z.string().optional(),
    user_id: z.string().optional().describe('Auth0 user ID for whom the ticket should be created. Example: "auth0|1234567890abcdef"'),
    client_id: z.string().optional(),
    organization_id: z.string().optional(),
    connection_id: z.string().optional(),
    email: z.string().optional(),
    ttl_sec: z.number().int().min(0).optional().describe('Number of seconds the ticket is valid before expiration. Defaults to 432000 (5 days).'),
    mark_email_as_verified: z.boolean().optional(),
    includeEmailInRedirect: z.boolean().optional(),
    identity: IdentitySchema.optional()
});

const ProviderResponseSchema = z.object({
    ticket: z.string()
});

const OutputSchema = z.object({
    ticket: z.string().describe('URL representing the password change ticket.')
});

const action = createAction({
    description: 'Create an Auth0 password change ticket.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-password-change-ticket',
        group: 'Tickets'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['create:user_tickets'],

    exec: async (nango, input) => {
        const response = await nango.post({
            // https://auth0.com/docs/api/management/v2/tickets/post-password-change
            endpoint: '/api/v2/tickets/password-change',
            data: {
                ...(input['result_url'] !== undefined && { result_url: input['result_url'] }),
                ...(input['user_id'] !== undefined && { user_id: input['user_id'] }),
                ...(input['client_id'] !== undefined && { client_id: input['client_id'] }),
                ...(input['organization_id'] !== undefined && { organization_id: input['organization_id'] }),
                ...(input['connection_id'] !== undefined && { connection_id: input['connection_id'] }),
                ...(input['email'] !== undefined && { email: input['email'] }),
                ...(input['ttl_sec'] !== undefined && { ttl_sec: input['ttl_sec'] }),
                ...(input['mark_email_as_verified'] !== undefined && { mark_email_as_verified: input['mark_email_as_verified'] }),
                ...(input['includeEmailInRedirect'] !== undefined && { includeEmailInRedirect: input['includeEmailInRedirect'] }),
                ...(input['identity'] !== undefined && { identity: input['identity'] })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            ticket: providerResponse.ticket
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
