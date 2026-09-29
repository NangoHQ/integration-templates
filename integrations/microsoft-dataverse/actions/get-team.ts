import { z } from 'zod';
import { createAction } from 'nango';

const DEFAULT_SELECT = ['teamid', 'name', 'description', 'teamtype', 'isdefault', 'azureactivedirectoryobjectid', 'createdon', 'modifiedon'];

const InputSchema = z
    .object({
        team_id: z.string().describe('Unique identifier (GUID) of the team to retrieve. Example: "0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d".'),
        select: z
            .array(z.string())
            .optional()
            .describe(
                'Team column logical names to return via OData $select, e.g. ["name", "teamtype"]. Defaults to a common set of team columns when omitted. The primary key teamid is always included.'
            )
    })
    .describe('Input for retrieving a single team by id.');

const OutputSchema = z
    .looseObject({
        teamid: z.string().describe('Unique identifier (GUID) of the team.'),
        name: z.string().nullable().optional().describe('Name of the team. Omitted when empty or not selected.'),
        description: z.string().nullable().optional().describe('Description of the team. Omitted when empty or not selected.'),
        teamtype: z
            .number()
            .nullable()
            .optional()
            .describe('Team type: 0 = Owner, 1 = Access, 2 = Microsoft Entra security group, 3 = Microsoft Entra Office group. Omitted when not selected.'),
        isdefault: z.boolean().nullable().optional().describe('Whether the team is the default team of its business unit. Omitted when not selected.'),
        azureactivedirectoryobjectid: z
            .string()
            .nullable()
            .optional()
            .describe('Object id of the linked Microsoft Entra group, present only for Microsoft Entra-backed teams. Omitted otherwise.'),
        createdon: z.string().nullable().optional().describe('ISO 8601 timestamp of when the team was created. Example: "2024-05-01T12:34:56Z".'),
        modifiedon: z.string().nullable().optional().describe('ISO 8601 timestamp of when the team was last modified. Example: "2024-05-01T12:34:56Z".')
    })
    .describe(
        'The retrieved team record. Attributes beyond the ones listed, including custom team fields, depend on the select input and are passed through unchanged.'
    );

/**
 * @tags: [read]
 * @tagReason: Retrieves a single team through an idempotent GET request and performs no provider-side mutation.
 */
const action = createAction({
    description: 'Retrieve a single team by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const select = [...(input.select ?? DEFAULT_SELECT)];
        if (!select.includes('teamid')) {
            select.push('teamid');
        }

        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
        const response = await nango.get({
            endpoint: `/api/data/v9.2/teams(${encodeURIComponent(input.team_id)})`,
            params: {
                $select: select.join(',')
            },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
