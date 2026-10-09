import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        account_id: z
            .number()
            .int()
            .positive()
            .describe('Timely account ID that owns the client. Example: 1145787. Discover it with the list-accounts action.'),
        client_id: z.number().int().positive().describe('ID of the client to update. Example: 2193170.'),
        name: z.string().min(1).optional().describe('New client name. Timely rejects an empty or blank name.'),
        color: z.string().max(6).optional().describe('New client color as a hex string of up to 6 characters with no leading "#". Example: "1976d2".'),
        external_id: z.string().optional().describe('New external identifier. Pass an empty string to clear the current value; Timely ignores a null value.'),
        active: z.boolean().optional().describe('Set to false to deactivate the client so it no longer appears in list-clients; true reactivates it.')
    })
    .describe('Fields to change on a Timely client. Provide at least one of name, color, external_id, or active.');

const ProviderClientSchema = z.object({
    id: z.number(),
    name: z.string(),
    color: z.string().nullable(),
    active: z.boolean(),
    external_id: z.string().nullable(),
    updated_at: z.string().nullable()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique Timely client ID.'),
        name: z.string().describe('Client name after the update.'),
        color: z.string().nullable().describe('Client color as a hex string with no leading "#".'),
        active: z.boolean().describe('Whether the client is active. false means it is hidden from the default list-clients results.'),
        external_id: z.string().nullable().describe('External identifier for the client, or null if none is set.'),
        updated_at: z.string().nullable().describe('ISO-8601 timestamp with timezone offset of the last update to the client.')
    })
    .describe('The Timely client after the update.');

/**
 * @tags: [write, destructive]
 * @tagReason: Mutates an existing client's fields and can deactivate (soft-remove) it via active:false, which removes it from list-clients and clears/replaces the supplied field values.
 * @pitfalls: Deactivating via active:false is the only way to remove a client (no delete exists) and is reversible by setting active:true; external_id:null is ignored, so pass an empty string to clear it; a read immediately after an update may briefly return stale values.
 */
const action = createAction({
    description:
        "Update a client's fields (partial merge), including deactivating it via active:false - the only confirmed way to 'remove' a client since no delete endpoint exists.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const client: { name?: string; color?: string; external_id?: string; active?: boolean } = {};
        if (input.name !== undefined) {
            client.name = input.name;
        }
        if (input.color !== undefined) {
            client.color = input.color;
        }
        if (input.external_id !== undefined) {
            client.external_id = input.external_id;
        }
        if (input.active !== undefined) {
            client.active = input.active;
        }

        if (Object.keys(client).length === 0) {
            throw new nango.ActionError({
                type: 'no_fields',
                message: 'Provide at least one of name, color, external_id, or active to update.'
            });
        }

        const response = await nango.put({
            // Timely API reference: https://developer.timely.com/ (docs are login-walled; PUT /1.1/{account_id}/clients/{client_id} confirmed live)
            endpoint: `/1.1/${encodeURIComponent(String(input.account_id))}/clients/${encodeURIComponent(String(input.client_id))}`,
            data: { client },
            retries: 3
        });

        const providerClient = ProviderClientSchema.parse(response.data);

        return {
            id: providerClient.id,
            name: providerClient.name,
            color: providerClient.color,
            active: providerClient.active,
            external_id: providerClient.external_id,
            updated_at: providerClient.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
