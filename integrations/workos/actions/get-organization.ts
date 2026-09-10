import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ organization_id: z.string().min(1).describe('WorkOS organization ID. Example: "org_01H..."') });
const DomainSchema = z.object({
    object: z.literal('organization_domain'),
    id: z.string(),
    domain: z.string(),
    organization_id: z.string(),
    state: z.string(),
    verification_token: z.string().optional(),
    verification_strategy: z.string(),
    verification_prefix: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});
const OrganizationSchema = z
    .object({
        object: z.literal('organization'),
        id: z.string(),
        name: z.string(),
        allow_profiles_outside_organization: z.boolean(),
        domains: z.array(DomainSchema),
        stripe_customer_id: z.string().nullable().optional(),
        created_at: z.string(),
        updated_at: z.string(),
        external_id: z.string().nullable().optional(),
        metadata: z.record(z.string(), z.string()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a WorkOS organization by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OrganizationSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OrganizationSchema>> => {
        const response = await nango.get({
            // https://workos.com/docs/reference/organization
            endpoint: `/organizations/${encodeURIComponent(input.organization_id)}`,
            retries: 3
        });
        return OrganizationSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
