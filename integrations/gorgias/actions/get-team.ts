import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The ID of the team to retrieve. Example: 123')
    })
    .describe('Input for retrieving a single team by ID');

const TeamMemberSchema = z.object({
    id: z.number().describe('ID of the user'),
    name: z.string().nullable().describe('The full name of the user'),
    email: z.string().nullable().describe('The email address of the user'),
    meta: z.null().describe('User-defined JSON field; always null in team member responses')
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the team'),
        uri: z.string().describe('URI of the object (auto-generated)'),
        name: z.string().describe('Name of the team'),
        description: z.string().nullable().describe('Longer description of the team'),
        decoration: z
            .record(z.string(), z.unknown())
            .nullable()
            .describe('Object describing how the team appears on the webpage; currently only supports `emoji` field'),
        members: z.array(TeamMemberSchema).describe('The list of users within the team'),
        created_datetime: z.string().nullable().describe('When the team was created')
    })
    .describe('A single team retrieved from the Gorgias API');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single team by ID from the Gorgias API.
 */
const action = createAction({
    description: 'Retrieve a single team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.gorgias.com/reference/get-team
        const response = await nango.get({
            endpoint: `/api/teams/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Team not found',
                team_id: input.id
            });
        }

        const team = OutputSchema.parse(response.data);
        return team;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
