import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string(),
    key: z.string(),
    description: z.string().optional(),
    permissions: z.array(z.string()).optional(),
    include_in_initial_role_set: z.boolean().optional()
});
const ResourceSchema = z
    .object({
        id: z.string(),
        object: z.string().optional(),
        name: z.string(),
        key: z.string(),
        description: z.string().nullable().optional(),
        permissions: z.array(z.object({ id: z.string(), key: z.string().optional(), name: z.string().optional() }).passthrough()).optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional()
    })
    .passthrough();
const OutputSchema = ResourceSchema;
const action = createAction({
    description: 'Create a Clerk organization role.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://clerk.com/docs/reference/backend-api/tag/Organization-Roles#operation/CreateOrganizationRole
            endpoint: '/v1/organization_roles',
            data: {
                name: input.name,
                key: input.key,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.permissions !== undefined && { permissions: input.permissions }),
                ...(input.include_in_initial_role_set !== undefined && { include_in_initial_role_set: input.include_in_initial_role_set })
            },
            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
