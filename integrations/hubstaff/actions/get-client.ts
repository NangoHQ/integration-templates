import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Client ID. Example: "458914"')
});

const ProviderClientSchema = z
    .object({
        id: z.number(),
        organization_id: z.number(),
        name: z.string(),
        emails: z.array(z.string()),
        phone: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
        project_ids: z.array(z.number()),
        inherit_invoice_notes: z.boolean(),
        inherit_net_terms: z.boolean(),
        status: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        metadata: z.unknown()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number(),
    organization_id: z.number(),
    name: z.string(),
    emails: z.array(z.string()),
    phone: z.string().optional(),
    address: z.string().optional(),
    project_ids: z.array(z.number()),
    inherit_invoice_notes: z.boolean(),
    inherit_net_terms: z.boolean(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    metadata: z.unknown().optional()
});

const action = createAction({
    description: 'Get a single client by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hubstaff:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.hubstaff.com/
            endpoint: `v2/clients/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Client not found',
                id: input.id
            });
        }

        const wrapper = z.object({ client: ProviderClientSchema }).parse(response.data);
        const providerClient = wrapper.client;

        return {
            id: providerClient.id,
            organization_id: providerClient.organization_id,
            name: providerClient.name,
            emails: providerClient.emails,
            ...(providerClient.phone != null && { phone: providerClient.phone }),
            ...(providerClient.address != null && { address: providerClient.address }),
            project_ids: providerClient.project_ids,
            inherit_invoice_notes: providerClient.inherit_invoice_notes,
            inherit_net_terms: providerClient.inherit_net_terms,
            status: providerClient.status,
            created_at: providerClient.created_at,
            updated_at: providerClient.updated_at,
            ...(providerClient.metadata !== undefined && { metadata: providerClient.metadata })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
