import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The identifier of the issue to update. Example: "issue-uuid-123"'),
    title: z.string().optional().describe('The title of the issue.'),
    description: z.string().optional().describe('The description of the issue.'),
    priority: z.number().int().min(0).max(4).optional().describe('The priority of the issue. 0 = No priority, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low.'),
    stateId: z.string().optional().describe('The identifier of the workflow state to assign to the issue.'),
    assigneeId: z.string().optional().describe('The identifier of the user to assign the issue to.'),
    labelIds: z.array(z.string()).optional().describe('The identifiers of the labels to apply to the issue.'),
    projectId: z.string().optional().describe('The identifier of the project to move the issue to.')
});

const OutputSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    description: z.union([z.string(), z.null()]),
    priority: z.number().int(),
    state: z.object({
        id: z.string(),
        name: z.string()
    }),
    assignee: z.union([
        z.object({
            id: z.string(),
            name: z.string()
        }),
        z.null()
    ]),
    labels: z.array(
        z.object({
            id: z.string(),
            name: z.string()
        })
    ),
    project: z.union([
        z.object({
            id: z.string(),
            name: z.string()
        }),
        z.null()
    ]),
    url: z.string()
});

const action = createAction({
    description: 'Update fields on an existing Linear issue.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-issue',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build the update payload dynamically based on provided fields
        const updateData: Record<string, unknown> = {};
        if (input.title !== undefined) {
            updateData['title'] = input.title;
        }
        if (input.description !== undefined) {
            updateData['description'] = input.description;
        }
        if (input.priority !== undefined) {
            updateData['priority'] = input.priority;
        }
        if (input.stateId !== undefined) {
            updateData['stateId'] = input.stateId;
        }
        if (input.assigneeId !== undefined) {
            updateData['assigneeId'] = input.assigneeId;
        }
        if (input.labelIds !== undefined) {
            updateData['labelIds'] = input.labelIds;
        }
        if (input.projectId !== undefined) {
            updateData['projectId'] = input.projectId;
        }

        // https://linear.app/developers
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
                        issueUpdate(id: $id, input: $input) {
                            success
                            issue {
                                id
                                identifier
                                title
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
                                url
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id,
                    input: updateData
                }
            },
            retries: 3
        });

        const result = response.data;
        if (!result || result.errors || !result.data || !result.data.issueUpdate || !result.data.issueUpdate.success) {
            const errorMessage = result?.errors?.[0]?.message || 'Failed to update issue';
            throw new nango.ActionError({
                type: 'api_error',
                message: errorMessage
            });
        }

        const issue = result.data.issueUpdate.issue;

        return {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            description: issue.description ?? null,
            priority: issue.priority,
            state: {
                id: issue.state.id,
                name: issue.state.name
            },
            assignee: issue.assignee
                ? {
                      id: issue.assignee.id,
                      name: issue.assignee.name
                  }
                : null,
            labels:
                issue.labels?.nodes?.map((label: { id: string; name: string }) => ({
                    id: label.id,
                    name: label.name
                })) || [],
            project: issue.project
                ? {
                      id: issue.project.id,
                      name: issue.project.name
                  }
                : null,
            url: issue.url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
