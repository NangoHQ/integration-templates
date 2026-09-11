import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ organization_role_id: z.string() });
const OutputSchema = z.object({ id: z.string(), success: z.boolean() });
const action = createAction({
    description: 'Delete a Clerk organization role.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://clerk.com/docs/reference/backend-api/tag/Organization-Roles#operation/DeleteOrganizationRole
            endpoint: `/v1/organization_roles/${encodeURIComponent(input.organization_role_id)}`,
            retries: 3
        });
        return { id: input.organization_role_id, success: true };
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
