import { z } from 'zod';
import { createAction } from 'nango';

const DomainDataSchema = z.object({ domain: z.string(), state: z.enum(['verified', 'pending']) });
const InputSchema = z.object({
    organization_id: z.string().min(1).describe('WorkOS organization ID. Example: "org_01H..."'),
    name: z.string().optional(),
    domain_data: z.array(DomainDataSchema).optional(),
    stripe_customer_id: z.string().nullable().optional(),
    external_id: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.string()).optional()
});
const OrganizationSchema = z
    .object({
        object: z.literal('organization'),
        id: z.string(),
        name: z.string(),
        allow_profiles_outside_organization: z.boolean(),
        domains: z.array(z.record(z.string(), z.unknown())),
        stripe_customer_id: z.string().nullable().optional(),
        created_at: z.string(),
        updated_at: z.string(),
        external_id: z.string().nullable().optional(),
        metadata: z.record(z.string(), z.string()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Update a WorkOS organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OrganizationSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OrganizationSchema>> => {
        const response = await nango.put({
            // https://workos.com/docs/reference/organization
            endpoint: `/organizations/${encodeURIComponent(input.organization_id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.domain_data !== undefined && { domain_data: input.domain_data }),
                ...(input.stripe_customer_id !== undefined && { stripe_customer_id: input.stripe_customer_id }),
                ...(input.external_id !== undefined && { external_id: input.external_id }),
                ...(input.metadata !== undefined && { metadata: input.metadata })
            },
            retries: 3
        });
        return OrganizationSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
