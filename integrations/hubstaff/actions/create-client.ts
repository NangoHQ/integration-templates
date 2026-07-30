import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.number().describe('Organization ID. Example: 775646'),
    name: z.string().describe('Client name. Example: "Nango Registry Test Client 3"')
});

const ProviderClientSchema = z.object({
    id: z.number(),
    organization_id: z.number(),
    name: z.string(),
    emails: z.array(z.string()).optional(),
    phone: z.string().nullable().optional(),
    address: z.string().optional(),
    project_ids: z.array(z.number()).optional(),
    inherit_invoice_notes: z.boolean().optional(),
    inherit_net_terms: z.boolean().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    metadata: z.unknown().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    organization_id: z.number(),
    name: z.string(),
    emails: z.array(z.string()).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    project_ids: z.array(z.number()).optional(),
    inherit_invoice_notes: z.boolean().optional(),
    inherit_net_terms: z.boolean().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    metadata: z.unknown().optional()
});

const action = createAction({
    description: 'Create a new client in an organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hubstaff:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.hubstaff.com/
            endpoint: `v2/organizations/${encodeURIComponent(String(input.organization_id))}/clients`,
            data: {
                name: input.name
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Hubstaff did not return a client object.'
            });
        }

        const envelope = z.object({ client: ProviderClientSchema }).parse(response.data);
        const client = envelope.client;

        return {
            id: client.id,
            organization_id: client.organization_id,
            name: client.name,
            ...(client.emails !== undefined && { emails: client.emails }),
            ...(client.phone != null && { phone: client.phone }),
            ...(client.address !== undefined && { address: client.address }),
            ...(client.project_ids !== undefined && { project_ids: client.project_ids }),
            ...(client.inherit_invoice_notes !== undefined && { inherit_invoice_notes: client.inherit_invoice_notes }),
            ...(client.inherit_net_terms !== undefined && { inherit_net_terms: client.inherit_net_terms }),
            ...(client.status !== undefined && { status: client.status }),
            ...(client.created_at !== undefined && { created_at: client.created_at }),
            ...(client.updated_at !== undefined && { updated_at: client.updated_at }),
            ...(client.metadata !== undefined && { metadata: client.metadata })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
