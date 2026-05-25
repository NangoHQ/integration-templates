import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    team_id: z.string().describe('ID of the Figma team to list projects from. Example: "1639747348117609063"')
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderResponseSchema = z.object({
    name: z.string(),
    projects: z.array(ProviderProjectSchema)
});

const OutputSchema = z.object({
    team_name: z.string(),
    projects: z.array(
        z.object({
            id: z.string(),
            name: z.string()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List projects from Figma.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-projects',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['projects:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'team_id is required in metadata.'
            });
        }

        const teamId = parsedMetadata.data.team_id;

        // https://developers.figma.com/docs/rest-api/projects-endpoints/#get-team-projects
        const response = await nango.get({
            endpoint: `/v1/teams/${encodeURIComponent(teamId)}/projects`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Received an invalid response from the Figma API.'
            });
        }

        return {
            team_name: parsed.data.name,
            projects: parsed.data.projects.map((project) => ({
                id: project.id,
                name: project.name
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
