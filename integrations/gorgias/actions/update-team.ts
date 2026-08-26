import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The ID of the team to update.'),
        name: z.string().optional().describe('Name of the team.'),
        description: z.string().nullable().optional().describe('Longer description of the team.'),
        decoration: z
            .object({
                emoji: z.string().optional().describe("Emoji that appears before the team's name on the webpage.")
            })
            .nullable()
            .optional()
            .describe('Object describing how the team appears on the webpage. Currently only supports `emoji` field.'),
        members: z
            .array(
                z.object({
                    id: z.number().describe('ID of the user.'),
                    name: z.string().nullable().optional().describe('The full name of the user.'),
                    email: z.string().nullable().optional().describe('The email address of the user.'),
                    meta: z
                        .record(z.string(), z.unknown())
                        .nullable()
                        .optional()
                        .describe('User-defined JSON field for storing additional info about the object.')
                })
            )
            .optional()
            .describe('The list of users within the team. Passing this replaces the entire membership list; omit it to leave current members unchanged.')
    })
    .describe('Fields to update on a team. Only the provided fields are changed; omit fields to leave them unchanged.');

const ProviderTeamSchema = z.object({
    id: z.number(),
    uri: z.string().optional(),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    decoration: z
        .object({
            emoji: z.string().optional()
        })
        .nullable()
        .optional(),
    members: z
        .array(
            z.object({
                id: z.number(),
                name: z.string().nullable().optional(),
                email: z.string().nullable().optional(),
                meta: z.record(z.string(), z.unknown()).nullable().optional()
            })
        )
        .optional(),
    created_datetime: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the team.'),
        uri: z.string().optional().describe('URI of the object (auto-generated).'),
        name: z.string().optional().describe('Name of the team.'),
        description: z.string().nullable().optional().describe('Longer description of the team.'),
        decoration: z
            .object({
                emoji: z.string().optional().describe("Emoji that appears before the team's name on the webpage.")
            })
            .nullable()
            .optional()
            .describe('Object describing how the team appears on the webpage. Currently only supports `emoji` field.'),
        members: z
            .array(
                z.object({
                    id: z.number().describe('ID of the user.'),
                    name: z.string().nullable().optional().describe('The full name of the user.'),
                    email: z.string().nullable().optional().describe('The email address of the user.'),
                    meta: z
                        .record(z.string(), z.unknown())
                        .nullable()
                        .optional()
                        .describe('User-defined JSON field for storing additional info about the object.')
                })
            )
            .optional()
            .describe('The list of users within the team.'),
        created_datetime: z.string().nullable().optional().describe('When the team was created.')
    })
    .describe('The updated team returned by the provider.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the updated team after modifying its name or description.
 * @pitfalls: Requires the users:write OAuth scope or the API returns 403. Passing members replaces the entire team membership list; omit it to leave current members unchanged.
 */
const action = createAction({
    description: "Update a team's name or description.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.gorgias.com/reference/update-team
            endpoint: `/api/teams/${encodeURIComponent(input.id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.decoration !== undefined && { decoration: input.decoration }),
                ...(input.members !== undefined && { members: input.members })
            },
            retries: 3
        });

        const providerTeam = ProviderTeamSchema.parse(response.data);

        return {
            id: providerTeam.id,
            ...(providerTeam.uri !== undefined && { uri: providerTeam.uri }),
            ...(providerTeam.name !== undefined && { name: providerTeam.name }),
            ...(providerTeam.description !== undefined && { description: providerTeam.description }),
            ...(providerTeam.decoration !== undefined && { decoration: providerTeam.decoration }),
            ...(providerTeam.members !== undefined && { members: providerTeam.members }),
            ...(providerTeam.created_datetime !== undefined && { created_datetime: providerTeam.created_datetime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
