import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    team_gid: z.string().describe('Globally unique identifier for the team. Example: "12345"'),
    limit: z.number().min(1).max(100).optional().describe('Results per page. The number of objects to return per page. Value must be between 1 and 100.'),
    offset: z.string().optional().describe('Offset token for pagination. An offset to the next page returned by the API. Omit for the first page.'),
    archived: z.boolean().optional().describe('Only return projects whose archived field takes on the value of this parameter.'),
    opt_fields: z.string().optional().describe('Comma-separated list of properties to include in the response.')
});

const ProjectSchema = z
    .object({
        gid: z.string(),
        resource_type: z.string(),
        name: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProjectSchema),
    next_offset: z.string().optional()
});

const action = createAction({
    description: 'List projects in a team.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-projects-for-team',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.asana.com/reference/getprojectsforteam
            endpoint: `/api/1.0/teams/${encodeURIComponent(input.team_gid)}/projects`,
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.offset !== undefined && { offset: input.offset }),
                ...(input.archived !== undefined && { archived: String(input.archived) }),
                ...(input.opt_fields !== undefined && { opt_fields: input.opt_fields })
            },
            headers: {
                'User-Agent': 'Nango/1.0'
            },
            retries: 3
        });

        const data = response.data;
        if (!data || typeof data !== 'object' || !('data' in data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Asana API'
            });
        }

        const items = z.array(z.unknown()).parse(data.data);
        const nextOffset =
            data.next_page && typeof data.next_page === 'object' && 'offset' in data.next_page && typeof data.next_page.offset === 'string'
                ? data.next_page.offset
                : undefined;

        return {
            items: items.map((item) => ProjectSchema.parse(item)),
            ...(nextOffset !== undefined && { next_offset: nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
