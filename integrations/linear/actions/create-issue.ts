import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.string().describe('Team ID to create the issue in. Example: "123e4567-e89b-12d3-a456-426614174000"'),
    title: z.string().describe('Title of the issue'),
    description: z.string().optional().describe('Description of the issue (supports markdown)'),
    priority: z.number().int().min(0).max(4).optional().describe('Priority of the issue (0-4, where 4 is urgent)'),
    stateId: z.string().optional().describe('Workflow state ID for the issue'),
    assigneeId: z.string().optional().describe('User ID to assign the issue to'),
    cycleId: z.string().optional().describe('Cycle ID to add the issue to'),
    labelIds: z.array(z.string()).optional().describe('Array of label IDs to add to the issue'),
    projectId: z.string().optional().describe('Project ID to associate the issue with')
});

const OutputSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    url: z.string(),
    title: z.string(),
    description: z.union([z.string(), z.null()]),
    priority: z.number(),
    stateId: z.union([z.string(), z.null()]),
    assigneeId: z.union([z.string(), z.null()]),
    teamId: z.string(),
    cycleId: z.union([z.string(), z.null()]),
    projectId: z.union([z.string(), z.null()]),
    createdAt: z.string()
});

const action = createAction({
    description: 'Create a new Linear issue',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-issue',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:create'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation IssueCreate($input: IssueCreateInput!) {
                issueCreate(input: $input) {
                    success
                    issue {
                        id
                        identifier
                        url
                        title
                        description
                        priority
                        state {
                            id
                        }
                        assignee {
                            id
                        }
                        team {
                            id
                        }
                        cycle {
                            id
                        }
                        project {
                            id
                        }
                        createdAt
                    }
                }
            }
        `;

        const variables = {
            input: {
                teamId: input.teamId,
                title: input.title,
                ...(input.description && { description: input.description }),
                ...(input.priority !== undefined && { priority: input.priority }),
                ...(input.stateId && { stateId: input.stateId }),
                ...(input.assigneeId && { assigneeId: input.assigneeId }),
                ...(input.cycleId && { cycleId: input.cycleId }),
                ...(input.labelIds && { labelIds: input.labelIds }),
                ...(input.projectId && { projectId: input.projectId })
            }
        };

        // https://developers.linear.app/docs/graphql/working-with-the-graphql-api
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: mutation,
                variables: variables
            },
            retries: 3
        });

        if (!response.data || !response.data.data || !response.data.data.issueCreate) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Invalid response from Linear API'
            });
        }

        const issueCreateResult = response.data.data.issueCreate;

        if (!issueCreateResult.success) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Failed to create issue'
            });
        }

        const issue = issueCreateResult.issue;

        if (!issue) {
            throw new nango.ActionError({
                type: 'missing_issue',
                message: 'Issue was not returned in the response'
            });
        }

        return {
            id: issue.id,
            identifier: issue.identifier,
            url: issue.url,
            title: issue.title,
            description: issue.description ?? null,
            priority: issue.priority ?? 0,
            stateId: issue.state?.id ?? null,
            assigneeId: issue.assignee?.id ?? null,
            teamId: issue.team?.id ?? input.teamId,
            cycleId: issue.cycle?.id ?? null,
            projectId: issue.project?.id ?? null,
            createdAt: issue.createdAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
