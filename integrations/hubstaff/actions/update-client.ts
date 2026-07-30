import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    clientId: z.number().describe('Client ID. Example: 458914'),
    name: z.string().optional(),
    status: z.string().optional().describe('Set to "archived" to retire the client')
});

const ProviderClientSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    organization_id: z.number().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    emails: z.array(z.string()).nullable().optional(),
    phone: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    project_ids: z.array(z.number()).nullable().optional(),
    inherit_invoice_notes: z.boolean().nullable().optional(),
    inherit_net_terms: z.boolean().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    status: z.string().optional(),
    organization_id: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    emails: z.array(z.string()).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    project_ids: z.array(z.number()).optional(),
    inherit_invoice_notes: z.boolean().optional(),
    inherit_net_terms: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: "Update a client's details, or archive it by setting status.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hubstaff:write'],

    exec: async (nango, input) => {
        if (input.name === undefined && input.status === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of name or status must be provided.'
            });
        }

        const data: Record<string, unknown> = {};
        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.status !== undefined) {
            data['status'] = input.status;
        }

        const response = await nango.put({
            // https://developer.hubstaff.com/
            endpoint: `v2/clients/${encodeURIComponent(input.clientId)}`,
            data,
            retries: 1
        });

        const raw = z.object({ client: ProviderClientSchema }).parse(response.data);
        const providerClient = raw.client;

        return {
            id: providerClient.id,
            ...(providerClient.name != null && { name: providerClient.name }),
            ...(providerClient.status != null && { status: providerClient.status }),
            ...(providerClient.organization_id != null && { organization_id: providerClient.organization_id }),
            ...(providerClient.created_at != null && { created_at: providerClient.created_at }),
            ...(providerClient.updated_at != null && { updated_at: providerClient.updated_at }),
            ...(providerClient.emails != null && { emails: providerClient.emails }),
            ...(providerClient.phone != null && { phone: providerClient.phone }),
            ...(providerClient.address != null && { address: providerClient.address }),
            ...(providerClient.project_ids != null && { project_ids: providerClient.project_ids }),
            ...(providerClient.inherit_invoice_notes != null && { inherit_invoice_notes: providerClient.inherit_invoice_notes }),
            ...(providerClient.inherit_net_terms != null && { inherit_net_terms: providerClient.inherit_net_terms }),
            ...(providerClient.metadata != null && { metadata: providerClient.metadata })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
