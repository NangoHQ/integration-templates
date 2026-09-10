import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.string(),
    user_id: z.string(),
    role: z.string(),
    public_metadata: z.record(z.string(), z.unknown()).optional(),
    private_metadata: z.record(z.string(), z.unknown()).optional()
});
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
    description: 'Create a membership in a Clerk organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://clerk.com/docs/reference/backend-api/tag/Organization-Memberships#operation/CreateOrganizationMembership
            endpoint: `/v1/organizations/${encodeURIComponent(input.organization_id)}/memberships`,
            data: {
                user_id: input.user_id,
                role: input.role,
                ...(input.public_metadata !== undefined && { public_metadata: input.public_metadata }),
                ...(input.private_metadata !== undefined && { private_metadata: input.private_metadata })
            },
            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
