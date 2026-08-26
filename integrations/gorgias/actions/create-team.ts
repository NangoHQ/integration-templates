import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Name of the team. Example: "Warehouse team"'),
        description: z.string().optional().describe('Longer description of the team.'),
        decoration: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Object describing how the team appears on the webpage. Currently only supports an emoji field.'),
        members: z
            .array(
                z.object({
                    id: z.number().optional().describe('ID of the user.'),
                    name: z.string().optional().describe('The full name of the user.'),
                    email: z.string().optional().describe('The email address of the user.')
                })
            )
            .optional()
            .describe('The list of users within the team.')
    })
    .describe('Input to create a Gorgias team.');

const ProviderTeamSchema = z.object({
    id: z.number(),
    uri: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    decoration: z.record(z.string(), z.unknown()).nullable(),
    members: z
        .array(
            z.object({
                id: z.number().nullable(),
                name: z.string().nullable(),
                email: z.string().nullable(),
                meta: z.unknown().nullable()
            })
        )
        .nullable(),
    created_datetime: z.string().nullable()
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the team.'),
        name: z.string().describe('Name of the team.'),
        uri: z.string().describe('URI of the object (auto-generated).'),
        description: z.string().optional().describe('Longer description of the team.'),
        decoration: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Object describing how the team appears on the webpage. Currently only supports an emoji field.'),
        members: z
            .array(
                z.object({
                    id: z.number().optional().describe('ID of the user.'),
                    name: z.string().optional().describe('The full name of the user.'),
                    email: z.string().optional().describe('The email address of the user.'),
                    meta: z.unknown().optional().describe('User-defined JSON field with additional info about the user.')
                })
            )
            .optional()
            .describe('The list of users within the team.'),
        created_datetime: z.string().optional().describe('When the team was created.')
    })
    .describe('The created Gorgias team.');

/**
 * @tags: [write]
 * @tagReason: Creates a new team in the provider.
 * @pitfalls: Requires the users:write OAuth scope even though no dedicated teams scope exists. Duplicate team names are rejected by the provider.
 */
const action = createAction({
    description: 'Create a team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.gorgias.com/reference/create-team
            endpoint: '/api/teams',
            data: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.decoration !== undefined && { decoration: input.decoration }),
                ...(input.members !== undefined && { members: input.members })
            },
            retries: 10
        });

        const providerTeam = ProviderTeamSchema.parse(response.data);

        return {
            id: providerTeam.id,
            name: providerTeam.name,
            uri: providerTeam.uri,
            ...(providerTeam.description != null && { description: providerTeam.description }),
            ...(providerTeam.decoration != null && { decoration: providerTeam.decoration }),
            ...(providerTeam.members != null && {
                members: providerTeam.members.map((member) => ({
                    ...(member.id != null && { id: member.id }),
                    ...(member.name != null && { name: member.name }),
                    ...(member.email != null && { email: member.email }),
                    ...(member.meta != null && { meta: member.meta })
                }))
            }),
            ...(providerTeam.created_datetime != null && { created_datetime: providerTeam.created_datetime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
