import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    team_id: z.string().trim().min(1).describe('The team ID. Example: "785d215c-9831-4702-8108-ff3b2db500c9"'),
    user_id: z.string().trim().min(1).describe('The user ID to add to the team. Example: "b8b30a2e-fdce-46d6-aef0-63ccf6155094"'),
    role: z.string().describe('The role for the user in the team. Example: "admin" or "standard"')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            id: z.string(),
            type: z.string(),
            attributes: z
                .object({
                    role: z.string().optional()
                })
                .passthrough(),
            relationships: z
                .object({
                    user: z
                        .object({
                            data: z.object({
                                id: z.string(),
                                type: z.string()
                            })
                        })
                        .optional()
                })
                .optional()
        })
        .optional(),
    included: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    team_id: z.string(),
    user_id: z.string(),
    role: z.string().optional()
});

const action = createAction({
    description: 'Add a user to a team with a given role',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/teams/#add-a-user-to-a-team
            endpoint: `v2/team/${encodeURIComponent(input.team_id)}/memberships`,
            data: {
                data: {
                    type: 'team_memberships',
                    attributes: {
                        role: input.role
                    },
                    relationships: {
                        user: {
                            data: {
                                type: 'users',
                                id: input.user_id
                            }
                        }
                    }
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (!parsed.data) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Datadog API returned an unexpected response without data.'
            });
        }

        return {
            id: parsed.data.id,
            team_id: input.team_id,
            user_id: parsed.data.relationships?.user?.data?.id || input.user_id,
            role: parsed.data.attributes?.role
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
