import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ organization_id: z.string().min(1).describe('WorkOS organization ID. Example: "org_01H..."') });
const OutputSchema = z.object({ id: z.string(), success: z.boolean() });

const action = createAction({
    description: 'Permanently delete a WorkOS organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://workos.com/docs/reference/organization
            endpoint: `/organizations/${encodeURIComponent(input.organization_id)}`,
            retries: 3
        });
        return { id: input.organization_id, success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
