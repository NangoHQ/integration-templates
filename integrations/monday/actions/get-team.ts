import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    team_id: z.string().describe('The unique identifier of the team to retrieve. Example: "13240071"')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional()
});

const ProviderTeamSchema = z.object({
    id: z.string(),
    name: z.string(),
    picture_url: z.string().nullable().optional(),
    owners: z.array(ProviderUserSchema).optional(),
    users: z.array(ProviderUserSchema.nullable()).optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            teams: z.array(ProviderTeamSchema).optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    picture_url: z.string().optional(),
    owners: z
        .array(
            z.object({
                id: z.string(),
                name: z.string(),
                email: z.string().optional()
            })
        )
        .optional(),
    users: z
        .array(
            z
                .object({
                    id: z.string(),
                    name: z.string(),
                    email: z.string().optional()
                })
                .nullable()
        )
        .optional()
});

const action = createAction({
    description: 'Retrieve a single team from monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-team'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['teams:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query($ids: [ID!]) {
                teams(ids: $ids) {
                    id
                    name
                    picture_url
                    owners {
                        id
                        name
                        email
                    }
                    users {
                        id
                        name
                        email
                    }
                }
            }
        `;

        const response = await nango.post({
            // https://developer.monday.com/api-reference/reference/teams
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: query,
                variables: {
                    ids: [input.team_id]
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            const firstError = providerResponse.errors[0];

            if (firstError) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: firstError.message
                });
            }
        }

        const teams = providerResponse.data?.teams;

        if (!teams || teams.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Team not found',
                team_id: input.team_id
            });
        }

        const team = teams[0];

        if (!team) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Team not found',
                team_id: input.team_id
            });
        }

        return {
            id: team.id,
            name: team.name,
            ...(team.picture_url != null && { picture_url: team.picture_url }),
            ...(team.owners !== undefined && {
                owners: team.owners.map((owner) => ({
                    id: owner.id,
                    name: owner.name,
                    ...(owner.email !== undefined && { email: owner.email })
                }))
            }),
            ...(team.users !== undefined && {
                users: team.users.map((user) => {
                    if (!user) {
                        return null;
                    }

                    return {
                        id: user.id,
                        name: user.name,
                        ...(user.email !== undefined && { email: user.email })
                    };
                })
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
