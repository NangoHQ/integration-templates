import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderUserSchema = z.object({
    id: z.number(),
    username: z.string(),
    email: z.string(),
    color: z.string(),
    role: z.number(),
    role_key: z.string(),
    last_active: z.string().optional()
});

const ProviderMemberSchema = z.object({
    user: ProviderUserSchema
});

const ProviderTeamSchema = z.object({
    id: z.string(),
    name: z.string(),
    members: z.array(ProviderMemberSchema)
});

const ProviderResponseSchema = z.object({
    teams: z.array(ProviderTeamSchema)
});

const OutputUserSchema = z.object({
    id: z.string(),
    username: z.string(),
    email: z.string(),
    color: z.string(),
    role: z.number(),
    role_key: z.string(),
    last_active: z.string().optional()
});

const OutputSchema = z.object({
    users: z.array(OutputUserSchema)
});

const action = createAction({
    description: 'List workspace members from ClickUp',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.clickup.com/reference/getauthorizedteams
        const response = await nango.get({
            endpoint: '/api/v2/team',
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        const users: z.infer<typeof OutputUserSchema>[] = [];
        for (const team of providerData.teams) {
            for (const member of team.members) {
                users.push({
                    id: String(member.user.id),
                    username: member.user.username,
                    email: member.user.email,
                    color: member.user.color,
                    role: member.user.role,
                    role_key: member.user.role_key,
                    ...(member.user.last_active !== undefined && {
                        last_active: member.user.last_active
                    })
                });
            }
        }

        return {
            users
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
