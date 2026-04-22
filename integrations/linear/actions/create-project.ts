import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Project name. Example: "Q1 Roadmap"'),
    description: z.string().optional().describe('Project description. Example: "Planning for Q1 initiatives"'),
    lead_id: z.string().optional().describe('User ID of the project lead. Example: "user-123"'),
    team_ids: z.array(z.string()).describe('Array of team IDs to associate with the project. Example: ["team-123"]').optional(),
    target_date: z.string().optional().describe('Target completion date in ISO 8601 format (YYYY-MM-DD or with time). Example: "2026-12-31"'),
    start_date: z.string().optional().describe('Project start date in ISO 8601 format (YYYY-MM-DD or with time). Example: "2026-01-01"'),
    status: z
        .enum(['planned', 'started', 'paused', 'completed', 'canceled'])
        .optional()
        .describe('Project status/state. One of: planned, started, paused, completed, canceled')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.union([z.string(), z.null()]),
    slug_id: z.string(),
    state: z.string(),
    url: z.string(),
    lead_id: z.union([z.string(), z.null()]),
    team_ids: z.array(z.string()),
    target_date: z.union([z.string(), z.null()]),
    start_date: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Create a Linear project',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-project',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build the input object for the GraphQL mutation
        const projectInput: Record<string, unknown> = {
            name: input.name
        };

        if (input.description) {
            projectInput['description'] = input.description;
        }

        if (input.lead_id) {
            projectInput['leadId'] = input.lead_id;
        }

        if (input.team_ids && input.team_ids.length > 0) {
            projectInput['teamIds'] = input.team_ids;
        }

        if (input.target_date) {
            projectInput['targetDate'] = input.target_date;
        }

        if (input.start_date) {
            projectInput['startDate'] = input.start_date;
        }

        if (input.status) {
            projectInput['state'] = input.status;
        }

        // https://developers.linear.app/docs/graphql
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    mutation ProjectCreate($input: ProjectCreateInput!) {
                        projectCreate(input: $input) {
                            success
                            project {
                                id
                                name
                                description
                                slugId
                                state
                                url
                                lead {
                                    id
                                }
                                teams {
                                    nodes {
                                        id
                                    }
                                }
                                targetDate
                                startDate
                            }
                        }
                    }
                `,
                variables: {
                    input: projectInput
                }
            },
            retries: 1
        });

        if (!response.data || !response.data.data || !response.data.data.projectCreate) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Unexpected response from Linear API',
                response: response.data
            });
        }

        const result = response.data.data.projectCreate;

        if (!result.success) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Failed to create project',
                errors: result.errors || []
            });
        }

        const project = result.project;

        if (!project) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Project was not returned after creation'
            });
        }

        // Extract team IDs from the teams connection
        const teamIds: string[] = [];
        if (project.teams && project.teams.nodes && Array.isArray(project.teams.nodes)) {
            for (const team of project.teams.nodes) {
                if (team && team.id) {
                    teamIds.push(team.id);
                }
            }
        }

        return {
            id: project.id,
            name: project.name,
            description: project.description ?? null,
            slug_id: project.slugId,
            state: project.state,
            url: project.url,
            lead_id: project.lead?.id ?? null,
            team_ids: teamIds,
            target_date: project.targetDate ?? null,
            start_date: project.startDate ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
