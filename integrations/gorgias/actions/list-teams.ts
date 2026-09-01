import { z } from 'zod';
import { createAction } from 'nango';

const ListTeamsInputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z.number().optional().describe('Maximum number of teams to return per page. Defaults to 30.'),
        order_by: z.string().optional().describe('Sort order for results. Example: "created_datetime:desc".')
    })
    .describe('Input parameters for listing teams.');

const TeamMemberSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional()
});

const TeamMemberOutputSchema = z.object({
    id: z.number().describe('ID of the team member.'),
    name: z.string().optional().describe('Full name of the team member.'),
    email: z.string().optional().describe('Email address of the team member.')
});

const ProviderTeamSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    decoration: z.record(z.string(), z.unknown()).nullable().optional(),
    members: z.array(TeamMemberSchema).optional(),
    created_datetime: z.string().nullable().optional(),
    uri: z.string().optional()
});

const TeamOutputSchema = z.object({
    id: z.number().describe('Unique identifier for the team.'),
    name: z.string().describe('Name of the team.'),
    description: z.string().optional().describe('Longer description of the team.'),
    created_datetime: z.string().optional().describe('ISO 8601 timestamp when the team was created.'),
    uri: z.string().optional().describe('URI of the team object.'),
    members: z.array(TeamMemberOutputSchema).optional().describe('List of users within the team.')
});

const ListTeamsOutputSchema = z
    .object({
        items: z.array(TeamOutputSchema).describe('List of teams returned by the API.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page. Omitted when there are no more pages.')
    })
    .describe('Output of the list teams action.');

/**
 * @tags: [read]
 * @tagReason: Performs a GET request to retrieve a list of teams.
 */
const action = createAction({
    description: 'List teams.',
    version: '1.0.0',
    input: ListTeamsInputSchema,
    output: ListTeamsOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListTeamsOutputSchema>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/list-teams
            endpoint: '/api/teams',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.order_by !== undefined && { order_by: input.order_by })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            data: z.array(z.unknown()),
            meta: z.object({
                next_cursor: z.string().nullable().optional()
            })
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((item) => {
            const team = ProviderTeamSchema.parse(item);
            return {
                id: team.id,
                name: team.name,
                ...(team.description !== undefined && team.description !== null && { description: team.description }),
                ...(team.created_datetime !== undefined && team.created_datetime !== null && { created_datetime: team.created_datetime }),
                ...(team.uri !== undefined && { uri: team.uri }),
                ...(team.members !== undefined && {
                    members: team.members.map((member) => ({
                        id: member.id,
                        ...(member.name !== undefined && member.name !== null && { name: member.name }),
                        ...(member.email !== undefined && member.email !== null && { email: member.email })
                    }))
                })
            };
        });

        return {
            items,
            ...(providerResponse.meta.next_cursor !== undefined &&
                providerResponse.meta.next_cursor !== null && { next_cursor: providerResponse.meta.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
