import { z } from 'zod';
import { createAction } from 'nango';

const ProviderClientSchema = z.object({
    id: z.number(),
    name: z.string(),
    color: z.string().nullable().optional(),
    active: z.boolean(),
    external_id: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const InputSchema = z
    .object({
        account_id: z.number().int().positive().describe('Timely account ID that owns the client. Discover it with list-accounts. Example: 1145787'),
        client_id: z.number().int().positive().describe('ID of the client to retrieve. Example: 2193170')
    })
    .describe('Input for retrieving a single Timely client by account and client ID.');

const OutputSchema = z
    .object({
        id: z.number().describe('Unique client ID. Example: 2193170'),
        name: z.string().describe('Client name. Example: "Nango Developer"'),
        color: z.string().nullable().optional().describe('Hex color assigned to the client in Timely, without the leading "#", or null when unset. Example: "1976d2"'),
        active: z.boolean().describe('Whether the client is active; deactivated clients are hidden from list-clients but still retrievable here.'),
        external_id: z.string().nullable().optional().describe('External identifier for the client, or null when none has been set.'),
        updated_at: z.string().nullable().optional().describe('ISO 8601 timestamp of the last client update. Example: "2026-10-07T05:54:36+03:00"')
    })
    .describe('A single Timely client, including inactive ones.');

/**
 * @tags: [read]
 * @tagReason: Reads a single client from Timely; it performs no provider mutation.
 * @pitfalls: Deactivated clients are excluded from list-clients yet are still returned here by ID, so this is the only way to retrieve a retired client's details.
 */
const action = createAction({
    description: 'Retrieve a single client by ID, including inactive ones.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // Timely API docs (login-walled): https://developer.timely.com/ - GET /1.1/{account_id}/clients/{client_id} confirmed live
            endpoint: `/1.1/${encodeURIComponent(String(input.account_id))}/clients/${encodeURIComponent(String(input.client_id))}`,
            retries: 3
        });

        const client = ProviderClientSchema.parse(response.data);

        return {
            id: client.id,
            name: client.name,
            active: client.active,
            ...(client.color !== undefined && { color: client.color }),
            ...(client.external_id !== undefined && { external_id: client.external_id }),
            ...(client.updated_at !== undefined && { updated_at: client.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
