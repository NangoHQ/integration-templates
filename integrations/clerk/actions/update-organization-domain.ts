import { z } from 'zod';
import { createAction } from 'nango';

const EnrollmentModeSchema = z.enum(['manual_invitation', 'automatic_invitation', 'automatic_suggestion', 'enterprise_sso']);
const InputSchema = z.object({
    organization_id: z.string(),
    domain_id: z.string(),
    enrollment_mode: EnrollmentModeSchema.optional(),
    verified: z.boolean().optional()
});
const ResourceSchema = z
    .object({
        id: z.string(),
        object: z.string().optional(),
        organization_id: z.string().optional(),
        name: z.string(),
        enrollment_mode: EnrollmentModeSchema.optional(),
        affiliation_verification: z.object({ attempts: z.number().optional(), status: z.string().optional() }).passthrough().optional(),
        verification: z.object({ attempts: z.number().optional(), status: z.string().optional() }).passthrough().optional(),
        verified: z.boolean().optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional()
    })
    .passthrough();
const OutputSchema = ResourceSchema;
const action = createAction({
    description: 'Update a verified domain for a Clerk organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://clerk.com/docs/reference/backend-api/tag/Organization-Domains#operation/UpdateOrganizationDomain
            endpoint: `/v1/organizations/${encodeURIComponent(input.organization_id)}/domains/${encodeURIComponent(input.domain_id)}`,
            data: {
                ...(input.enrollment_mode !== undefined && { enrollment_mode: input.enrollment_mode }),
                ...(input.verified !== undefined && { verified: input.verified })
            },
            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
