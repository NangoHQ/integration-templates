import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ organization_domain_id: z.string() });
const ResourceSchema = z
    .object({
        object: z.literal('organization_domain'),
        id: z.string(),
        organization_id: z.string(),
        domain: z.string(),
        state: z.enum(['failed', 'legacy_verified', 'pending', 'unverified', 'verified']).optional(),
        verification_prefix: z.string().optional(),
        verification_token: z.string().optional(),
        verification_strategy: z.enum(['dns', 'manual']).optional(),
        created_at: z.string(),
        updated_at: z.string()
    })
    .passthrough();
const OutputSchema = ResourceSchema;
const action = createAction({
    description: 'Verify a WorkOS organization domain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://workos.com/docs/reference/organization-domain
            endpoint: `/organization_domains/${encodeURIComponent(input.organization_domain_id)}/verify`,
            data: {},
            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
