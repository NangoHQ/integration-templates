import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueId: z.string().describe('Linear issue ID. Example: "c77a8b8e-aaaa-0000-cccc-111111111111"')
});

const AssigneeSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    email: z.union([z.string(), z.null()])
});

const TeamSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    key: z.union([z.string(), z.null()])
});

const StateSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    type: z.union([z.string(), z.null()])
});

const LabelSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    color: z.union([z.string(), z.null()])
});

const ProjectSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    state: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    id: z.string(),
    identifier: z.union([z.string(), z.null()]),
    title: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    state: z.union([StateSchema, z.null()]),
    assignee: z.union([AssigneeSchema, z.null()]),
    team: z.union([TeamSchema, z.null()]),
    labels: z.array(LabelSchema),
    project: z.union([ProjectSchema, z.null()]),
    url: z.union([z.string(), z.null()]),
    createdAt: z.union([z.string(), z.null()]),
    updatedAt: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Retrieve a Linear issue by issue ID',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-issue',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query GetIssue($id: String!) {
                issue(id: $id) {
                    id
                    identifier
                    title
                    description
                    url
                    createdAt
                    updatedAt
                    state {
                        id
                        name
                        type
                    }
                    assignee {
                        id
                        name
                        email
                    }
                    team {
                        id
                        name
                        key
                    }
                    labels {
                        nodes {
                            id
                            name
                            color
                        }
                    }
                    project {
                        id
                        name
                        state
                    }
                }
            }
        `;

        // https://linear.app/developers/api-reference/graphql#issue
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query,
                variables: {
                    id: input.issueId
                }
            },
            retries: 3
        });

        const issueData = response.data?.data?.issue;

        if (!issueData) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Issue with ID "${input.issueId}" was not found`,
                issueId: input.issueId
            });
        }

        return {
            id: issueData.id,
            identifier: issueData.identifier ?? null,
            title: issueData.title ?? null,
            description: issueData.description ?? null,
            url: issueData.url ?? null,
            createdAt: issueData.createdAt ?? null,
            updatedAt: issueData.updatedAt ?? null,
            state: issueData.state
                ? {
                      id: issueData.state.id,
                      name: issueData.state.name ?? null,
                      type: issueData.state.type ?? null
                  }
                : null,
            assignee: issueData.assignee
                ? {
                      id: issueData.assignee.id,
                      name: issueData.assignee.name ?? null,
                      email: issueData.assignee.email ?? null
                  }
                : null,
            team: issueData.team
                ? {
                      id: issueData.team.id,
                      name: issueData.team.name ?? null,
                      key: issueData.team.key ?? null
                  }
                : null,
            labels:
                issueData.labels?.nodes?.map((label: { id: string; name?: string; color?: string }) => ({
                    id: label.id,
                    name: label.name ?? null,
                    color: label.color ?? null
                })) ?? [],
            project: issueData.project
                ? {
                      id: issueData.project.id,
                      name: issueData.project.name ?? null,
                      state: issueData.project.state ?? null
                  }
                : null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
