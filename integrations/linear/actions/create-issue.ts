import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const IdNameSchema = z.object({
    id: z.string(),
    name: z.string()
});

const InputSchema = z.object({
    teamId: z.string().describe('Team ID. Example: "9ce955cd-b013-4e79-bd0a-41bec5a67dd1"'),
    title: z.string().describe('Issue title'),
    description: z.string().optional().describe('Issue description'),
    priority: z.number().int().min(0).max(4).optional().describe('Priority: 0 = no priority, 1 = urgent, 2 = high, 3 = medium, 4 = low'),
    assigneeId: z.string().optional().describe('User ID to assign the issue to'),
    stateId: z.string().optional().describe('Workflow state ID'),
    cycleId: z.string().optional().describe('Cycle ID'),
    labelIds: z.array(z.string()).optional().describe('Array of label IDs to attach'),
    projectId: z.string().optional().describe('Project ID')
});

const IssueSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    url: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    priority: z.number().nullable().optional(),
    state: IdNameSchema.nullable().optional(),
    assignee: IdNameSchema.nullable().optional(),
    team: IdNameSchema.nullable().optional(),
    cycle: IdNameSchema.nullable().optional(),
    labels: z
        .object({
            nodes: z.array(IdNameSchema)
        })
        .nullable()
        .optional(),
    project: IdNameSchema.nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional()
});

const GraphQLErrorSchema = z.object({
    message: z.string()
});

const MutationResponseSchema = z
    .object({
        data: z
            .object({
                issueCreate: z.object({
                    success: z.boolean(),
                    issue: IssueSchema.nullable().optional()
                })
            })
            .nullable()
            .optional(),
        errors: z.array(GraphQLErrorSchema).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    url: z.string().optional(),
    description: z.string().optional(),
    priority: z.number().optional(),
    state: IdNameSchema.optional(),
    assignee: IdNameSchema.optional(),
    team: IdNameSchema.optional(),
    cycle: IdNameSchema.optional(),
    labels: z.array(IdNameSchema).optional(),
    project: IdNameSchema.optional(),
    // Legacy flat identifier fields, retained alongside the nested objects above for backwards compatibility.
    stateId: z.string().optional(),
    assigneeId: z.string().optional(),
    teamId: z.string().optional(),
    cycleId: z.string().optional(),
    projectId: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Create a new Linear issue',
    version: '3.0.4',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:create'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation CreateIssue($input: IssueCreateInput!) {
                issueCreate(input: $input) {
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
                            name
                        }
                        assignee {
                            id
                            name
                        }
                        team {
                            id
                            name
                        }
                        cycle {
                            id
                            name
                        }
                        labels {
                            nodes {
                                id
                                name
                            }
                        }
                        project {
                            id
                            name
                        }
                        createdAt
                        updatedAt
                    }
                }
            }
        `;

        const variables: Record<string, unknown> = {
            input: {
                teamId: input.teamId,
                title: input.title,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.priority !== undefined && { priority: input.priority }),
                ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
                ...(input.stateId !== undefined && { stateId: input.stateId }),
                ...(input.cycleId !== undefined && { cycleId: input.cycleId }),
                ...(input.labelIds !== undefined && { labelIds: input.labelIds }),
                ...(input.projectId !== undefined && { projectId: input.projectId })
            }
        };

        const config: ProxyConfiguration = {
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query: mutation,
                variables
            },
            retries: 3
        };

        const response = await nango.post(config);

        const parsedResult = MutationResponseSchema.safeParse(response.data);
        if (!parsedResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Linear API',
                details: parsedResult.error.issues
            });
        }

        const parsed = parsedResult.data;

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: parsed.errors.map((error) => error.message).join(', ')
            });
        }

        if (!parsed.data || !parsed.data.issueCreate.success || !parsed.data.issueCreate.issue) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Linear reported issue creation failed.'
            });
        }

        const issue = parsed.data.issueCreate.issue;

        return {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            ...(issue.url != null && { url: issue.url }),
            ...(issue.description != null && { description: issue.description }),
            ...(issue.priority != null && { priority: issue.priority }),
            ...(issue.state != null && { state: issue.state, stateId: issue.state.id }),
            ...(issue.assignee != null && { assignee: issue.assignee, assigneeId: issue.assignee.id }),
            ...(issue.team != null && { team: issue.team, teamId: issue.team.id }),
            ...(issue.cycle != null && { cycle: issue.cycle, cycleId: issue.cycle.id }),
            ...(issue.labels != null && { labels: issue.labels.nodes }),
            ...(issue.project != null && { project: issue.project, projectId: issue.project.id }),
            ...(issue.createdAt != null && { createdAt: issue.createdAt }),
            ...(issue.updatedAt != null && { updatedAt: issue.updatedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
