import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ organization_id: z.string(), domain_id: z.string() });
const ResourceSchema = z
    .object({
        id: z.string(),
        object: z.string().optional(),
        organization_id: z.string().optional(),
        name: z.string(),
        enrollment_mode: z.string().optional(),
        affiliation_verification: z.object({ attempts: z.number().optional(), status: z.string().optional() }).passthrough().optional(),
        verification: z.object({ attempts: z.number().optional(), status: z.string().optional() }).passthrough().optional(),
        verified: z.boolean().optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional()
    })
    .passthrough();
const OutputSchema = ResourceSchema;
const action = createAction({
    description: 'Verify ownership of a Clerk organization domain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://clerk.com/docs/reference/backend-api/tag/Organization-Domains#operation/VerifyOrganizationDomainOwnership
            endpoint: `/v1/organizations/${encodeURIComponent(input.organization_id)}/domains/${encodeURIComponent(input.domain_id)}/verify_ownership`,
            data: {},
            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
