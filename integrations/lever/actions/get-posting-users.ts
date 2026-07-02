import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    postingId: z.string().describe('The posting ID. Example: "75ff237f-c221-4c26-8b23-faf395f5ea1c"')
});

const PostingSummarySchema = z.object({
    id: z.string(),
    text: z.string()
});

const UserAccessSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    inheritedFromRoleId: z.string().optional(),
    conditions: z.record(z.string(), z.unknown()).optional()
});

const RoleAccessSchema = z.object({
    id: z.string(),
    name: z.string(),
    isReadOnly: z.boolean(),
    conditions: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    posting: PostingSummarySchema,
    users: z.array(UserAccessSchema),
    roles: z.array(RoleAccessSchema)
});

const action = createAction({
    description: 'List the users and access roles associated with a posting',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['postings:read:admin', 'users:read:admin'],

    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-users-with-access-to-a-posting
            endpoint: `/v1/postings/${encodeURIComponent(input.postingId)}/users`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Posting users not found',
                postingId: input.postingId
            });
        }

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
