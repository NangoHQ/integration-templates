import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ organization_role_id: z.string(), permission_id: z.string() });
const OutputSchema = z.object({ id: z.string(), success: z.boolean() });
const action = createAction({
    description: 'Remove a permission from a Clerk organization role.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://clerk.com/docs/reference/backend-api/tag/Organization-Roles#operation/RemovePermissionFromOrganizationRole
            endpoint: `/v1/organization_roles/${encodeURIComponent(input.organization_role_id)}/permissions/${encodeURIComponent(input.permission_id)}`,
            retries: 3
        });
        return { id: input.permission_id, success: true };
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
