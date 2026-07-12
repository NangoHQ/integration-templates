import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Group ID. Example: "00g14y5q5vaoT7IXb698"'),
    userId: z.string().describe('User ID. Example: "00u14y5o7tvvw1qA0698"')
});

const OutputSchema = z.object({
    userId: z.string(),
    groupId: z.string()
});

const action = createAction({
    description: 'Add a user to a group',
    version: '2.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.groups.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.okta.com/docs/reference/api/groups/#add-user-to-group
            endpoint: `/api/v1/groups/${encodeURIComponent(input.groupId)}/users/${encodeURIComponent(input.userId)}`,
            retries: 3
        };

        await nango.put(config);

        return {
            userId: input.userId,
            groupId: input.groupId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
