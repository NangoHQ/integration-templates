import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        account_id: z.number().int().positive().describe('Timely account ID. Discover it with the list-accounts action. Example: 1145787')
    })
    .describe('Input for listing the active clients (companies) of a Timely account.');

const ProviderClientSchema = z.object({
    id: z.number(),
    name: z.string(),
    color: z.string().nullable().optional(),
    active: z.boolean(),
    external_id: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const ClientSchema = z.object({
    id: z.number().describe('Unique client (company) ID.'),
    name: z.string().describe('Client (company) name.'),
    color: z.string().nullable().optional().describe('Hex color assigned to the client, or null if unset. Example: "1976d2"'),
    active: z.boolean().describe('Whether the client is active. Only active clients are returned by this action.'),
    external_id: z.string().nullable().optional().describe('Identifier of the linked external system record, or null if none.'),
    updated_at: z.string().nullable().optional().describe('ISO 8601 timestamp of the last client update. Example: "2026-10-07T05:54:36+03:00"')
});

const OutputSchema = z
    .object({
        clients: z.array(ClientSchema).describe('All active clients (companies) in the account.')
    })
    .describe('Active clients (companies) of a Timely account.');

/**
 * @tags: [read]
 * @tagReason: Reads the account's clients through the provider without creating, updating, or deleting anything.
 * @pitfalls: Only active clients are returned; a client deactivated through the update-client action disappears from this list entirely and cannot be included through any query parameter.
 */
const action = createAction({
    description: 'List all active clients (companies) in a Timely account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.timely.com/
            endpoint: `/1.1/${input.account_id}/clients`,
            retries: 3
        };

        const response = await nango.get(config);

        const clients = z.array(ProviderClientSchema).parse(response.data);

        return {
            clients: clients.map((client) => ({
                id: client.id,
                name: client.name,
                active: client.active,
                ...(client.color !== undefined && { color: client.color }),
                ...(client.external_id !== undefined && { external_id: client.external_id }),
                ...(client.updated_at !== undefined && { updated_at: client.updated_at })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
