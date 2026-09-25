import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ organization_id: z.string(), domain: z.string() });
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
    description: 'Create a WorkOS organization domain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://workos.com/docs/reference/organization-domain
            endpoint: '/organization_domains',
            data: { organization_id: input.organization_id, domain: input.domain },
            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
