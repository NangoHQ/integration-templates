import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    team_id: z.string().describe('Figma team ID. Example: "1639747348117609063"'),
    project_id: z.string().describe('The ID of the project to retrieve. Example: "604829489"')
});

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderTeamProjectsSchema = z.object({
    name: z.string(),
    projects: z.array(ProviderProjectSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string()
});

const action = createAction({
    description: 'Retrieve a single project from Figma.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects:read', 'files:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.figma.com/developers/api#get-team-projects-endpoint
            endpoint: `/v1/teams/${encodeURIComponent(input.team_id)}/projects`,
            retries: 3
        });

        const providerData = ProviderTeamProjectsSchema.safeParse(response.data);
        if (!providerData.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Figma API when listing team projects.'
            });
        }

        const project = providerData.data.projects.find((p) => p.id === input.project_id);
        if (!project) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Project with ID "${input.project_id}" was not found in team "${providerData.data.name}".`,
                project_id: input.project_id
            });
        }

        return {
            id: project.id,
            name: project.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
