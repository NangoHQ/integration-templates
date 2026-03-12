import { z } from 'zod';
import { createAction } from 'nango';

const UserSchema = z.object({
    id: z.string(),
    team_id: z.string(),
    name: z.string(),
    deleted: z.boolean(),
    real_name: z.union([z.string(), z.null()]),
    profile: z
        .object({
            real_name: z.union([z.string(), z.null()]),
            display_name: z.union([z.string(), z.null()]),
            email: z.union([z.string(), z.null()]),
            avatar_hash: z.union([z.string(), z.null()]),
            image_24: z.union([z.string(), z.null()]),
            image_32: z.union([z.string(), z.null()]),
            image_48: z.union([z.string(), z.null()]),
            image_72: z.union([z.string(), z.null()]),
            image_192: z.union([z.string(), z.null()]),
            image_512: z.union([z.string(), z.null()])
        })
        .passthrough(),
    is_admin: z.boolean(),
    is_owner: z.boolean(),
    is_bot: z.boolean(),
    updated: z.number()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.')
});

const OutputSchema = z.object({
    items: z.array(UserSchema),
    next_cursor: z.union([z.string(), z.null()]).describe('Pagination cursor for the next page. Null if no more pages.')
});

const action = createAction({
    description: 'List all users in the workspace',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/list-users',
        group: 'Users'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/users.list
        const config = {
            endpoint: 'users.list',
            params: {
                limit: '200',
                ...(input.cursor && { cursor: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || !response.data.members) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Unexpected API response: missing members data'
            });
        }

        const members = response.data.members.map((member: any) => ({
            id: member.id,
            team_id: member.team_id,
            name: member.name,
            deleted: member.deleted,
            real_name: member.real_name ?? null,
            profile: {
                real_name: member.profile?.real_name ?? null,
                display_name: member.profile?.display_name ?? null,
                email: member.profile?.email ?? null,
                avatar_hash: member.profile?.avatar_hash ?? null,
                image_24: member.profile?.image_24 ?? null,
                image_32: member.profile?.image_32 ?? null,
                image_48: member.profile?.image_48 ?? null,
                image_72: member.profile?.image_72 ?? null,
                image_192: member.profile?.image_192 ?? null,
                image_512: member.profile?.image_512 ?? null
            },
            is_admin: member.is_admin ?? false,
            is_owner: member.is_owner ?? false,
            is_bot: member.is_bot ?? false,
            updated: member.updated ?? 0
        }));

        return {
            items: members,
            next_cursor: response.data.response_metadata?.next_cursor || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
