import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.string().describe('Team ID. Example: "9cfb482a-81e3-4154-b5b9-2c805e70a02d"'),
    title: z.string().describe('Issue title'),
    description: z.string().optional().describe('Issue description in markdown'),
    priority: z.number().int().min(0).max(4).optional().describe('Priority from 0 (no priority) to 4 (low). 1=urgent, 2=high, 3=medium'),
    stateId: z.string().optional().describe('Workflow state ID'),
    assigneeId: z.string().optional().describe('Assignee user ID'),
    cycleId: z.string().optional().describe('Cycle ID'),
    labelIds: z.array(z.string()).optional().describe('Array of label IDs'),
    projectId: z.string().optional().describe('Project ID')
});

const ProviderIssueSchema = z.object({
    id: z.string(),
    identifier: z.string().optional(),
    title: z.string().optional(),
    url: z.string().optional(),
    description: z.string().optional().nullable(),
    priority: z.number().int().optional().nullable(),
    state: z
        .object({
            id: z.string()
        })
        .optional()
        .nullable(),
    assignee: z
        .object({
            id: z.string()
        })
        .optional()
        .nullable(),
    team: z
        .object({
            id: z.string()
        })
        .optional()
        .nullable(),
    cycle: z
        .object({
            id: z.string()
        })
        .optional()
        .nullable(),
    project: z
        .object({
            id: z.string()
        })
        .optional()
        .nullable()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        issueCreate: z.object({
            success: z.boolean(),
            issue: ProviderIssueSchema.optional().nullable()
        })
    }),
    errors: z
        .array(
            z.object({
                message: z.string(),
                path: z.array(z.string()).optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    identifier: z.string().optional(),
    title: z.string().optional(),
    url: z.string().optional(),
    description: z.string().optional(),
    priority: z.number().int().optional(),
    stateId: z.string().optional(),
    assigneeId: z.string().optional(),
    teamId: z.string().optional(),
    cycleId: z.string().optional(),
    projectId: z.string().optional()
});

const action = createAction({
    description: 'Create a new Linear issue.',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-issue',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables: Record<string, unknown> = {
            teamId: input.teamId,
            title: input.title,
            ...(input.description !== undefined && { description: input.description }),
            ...(input.priority !== undefined && { priority: input.priority }),
            ...(input.stateId !== undefined && { stateId: input.stateId }),
            ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
            ...(input.cycleId !== undefined && { cycleId: input.cycleId }),
            ...(input.labelIds !== undefined && { labelIds: input.labelIds }),
            ...(input.projectId !== undefined && { projectId: input.projectId })
        };

        const query = `
            mutation IssueCreate(
                $teamId: String!,
                $title: String!,
                $description: String,
                $priority: Int,
                $stateId: String,
                $assigneeId: String,
                $cycleId: String,
                $labelIds: [String!],
                $projectId: String
            ) {
                issueCreate(
                    input: {
                        teamId: $teamId
                        title: $title
                        description: $description
                        priority: $priority
                        stateId: $stateId
                        assigneeId: $assigneeId
                        cycleId: $cycleId
                        labelIds: $labelIds
                        projectId: $projectId
                    }
                ) {
                    success
                    issue {
                        id
                        identifier
                        title
                        url
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
                    }
                }
            }
        `;

        // https://developers.linear.app/docs/graphql/working-with-the-graphql-api
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: query,
                variables: variables
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Linear API',
                details: parsed.error.issues
            });
        }

        const issueCreate = parsed.data.data.issueCreate;

        if (parsed.data.errors && parsed.data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: parsed.data.errors.map((e) => e.message).join(', '),
                errors: parsed.data.errors
            });
        }

        if (!issueCreate.success || !issueCreate.issue) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Failed to create issue'
            });
        }

        const issue = issueCreate.issue;

        return {
            id: issue.id,
            ...(issue.identifier !== undefined && issue.identifier !== null && { identifier: issue.identifier }),
            ...(issue.title !== undefined && issue.title !== null && { title: issue.title }),
            ...(issue.url !== undefined && issue.url !== null && { url: issue.url }),
            ...(issue.description !== undefined && issue.description !== null && { description: issue.description }),
            ...(issue.priority !== undefined && issue.priority !== null && { priority: issue.priority }),
            ...(issue.state !== undefined && issue.state !== null && { stateId: issue.state.id }),
            ...(issue.assignee !== undefined && issue.assignee !== null && { assigneeId: issue.assignee.id }),
            ...(issue.team !== undefined && issue.team !== null && { teamId: issue.team.id }),
            ...(issue.cycle !== undefined && issue.cycle !== null && { cycleId: issue.cycle.id }),
            ...(issue.project !== undefined && issue.project !== null && { projectId: issue.project.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
