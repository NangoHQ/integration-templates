import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ organization_id: z.string(), user_id: z.string(), role: z.string() });
const ResourceSchema = z
    .object({
        id: z.string(),
        object: z.string().optional(),
        organization: z.object({ id: z.string() }).passthrough().optional(),
        public_user_data: z.object({ user_id: z.string() }).passthrough().optional(),
        role: z.string().optional(),
        permissions: z.array(z.string()).optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional()
    })
    .passthrough();
const OutputSchema = ResourceSchema;
const action = createAction({
    description: 'Update a Clerk organization membership role.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://clerk.com/docs/reference/backend-api/tag/Organization-Memberships#operation/UpdateOrganizationMembership
            endpoint: `/v1/organizations/${encodeURIComponent(input.organization_id)}/memberships/${encodeURIComponent(input.user_id)}`,
            data: { role: input.role },
            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
