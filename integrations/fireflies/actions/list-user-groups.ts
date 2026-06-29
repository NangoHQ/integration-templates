import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    mine: z.boolean().optional().describe('If true, returns only user groups the current user belongs to.')
});

const UserGroupMemberSchema = z.object({
    user_id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional()
});

const UserGroupSchema = z.object({
    id: z.string(),
    name: z.string(),
    handle: z.string().optional(),
    members: z.array(UserGroupMemberSchema).optional()
});

const GraphQlResponseSchema = z.object({
    data: z.object({
        user_groups: z.array(z.unknown())
    })
});

const OutputSchema = z.object({
    user_groups: z.array(UserGroupSchema)
});

const action = createAction({
    description: 'List user groups, optionally filtered to mine.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.fireflies.ai/graphql-api/query/user-groups
            endpoint: '/graphql',
            data: {
                query: `
                    query UserGroups($mine: Boolean) {
                        user_groups(mine: $mine) {
                            id
                            name
                            handle
                            members {
                                user_id
                                first_name
                                last_name
                                email
                            }
                        }
                    }
                `,
                variables: {
                    ...(input.mine !== undefined && { mine: input.mine })
                }
            },
            retries: 3
        });

        const parsedResponse = GraphQlResponseSchema.parse(response.data);
        const userGroups = parsedResponse.data.user_groups.map((group) => {
            return UserGroupSchema.parse(group);
        });

        return {
            user_groups: userGroups
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
