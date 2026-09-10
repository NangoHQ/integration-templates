import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_role_id: z.string(),
    name: z.string().optional(),
    key: z.string().optional(),
    description: z.string().optional(),
    permissions: z.array(z.string()).optional()
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
    description: 'Update a Clerk organization role.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://clerk.com/docs/reference/backend-api/tag/Organization-Roles#operation/UpdateOrganizationRole
            endpoint: `/v1/organization_roles/${encodeURIComponent(input.organization_role_id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.key !== undefined && { key: input.key }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.permissions !== undefined && { permissions: input.permissions })
            },
            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
