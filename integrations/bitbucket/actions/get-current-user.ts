import { createAction } from 'nango';
import * as z from 'zod';

const OutputSchema = z.object({
    type: z.string(),
    uuid: z.string(),
    username: z.string().optional(),
    display_name: z.string().optional(),
    nickname: z.string().optional(),
    account_id: z.string().optional(),
    created_on: z.string().optional()
});

const action = createAction({
    description: "Retrieve the authenticated user's profile",
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/actions/get-current-user' },
    input: z.object({}),
    output: OutputSchema,
    exec: async (nango, _input) => {
        // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-users/#api-user-get
        const response = await nango.get({
            endpoint: '/2.0/user',
            retries: 3
        });

        const parsed = OutputSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({ message: 'Failed to parse Bitbucket user response' });
        }

        return parsed.data;
    }
});

export default action;
