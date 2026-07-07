import { createAction } from 'nango';
import * as z from 'zod';

const inputSchema = z.object({
    ruleId: z.string()
});

const action = createAction({
    description: 'Activate a group membership rule so it starts evaluating users.',
    version: '1.0.0',
    input: inputSchema,
    output: z.null(),

    exec: async (nango, input) => {
        // https://developer.okta.com/docs/reference/api/groups/#activate-group-rule
        await nango.post({
            endpoint: `/api/v1/groups/rules/${encodeURIComponent(input.ruleId)}/lifecycle/activate`,
            retries: 1
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
