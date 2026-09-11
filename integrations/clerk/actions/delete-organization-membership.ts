import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ organization_id: z.string(), user_id: z.string() });
const OutputSchema = z.object({ id: z.string(), success: z.boolean() });
const action = createAction({
    description: 'Delete a membership from a Clerk organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://clerk.com/docs/reference/backend-api/tag/Organization-Memberships#operation/DeleteOrganizationMembership
            endpoint: `/v1/organizations/${encodeURIComponent(input.organization_id)}/memberships/${encodeURIComponent(input.user_id)}`,
            retries: 3
        });
        return { id: input.user_id, success: true };
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
