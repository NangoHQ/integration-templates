import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import * as z from 'zod';

const InputSchema = z.object({
    project_id: z.number(),
    source_branch: z.string(),
    target_branch: z.string(),
    title: z.string(),
    description: z.string().optional(),
    labels: z.string().optional(),
    assignee_ids: z.array(z.number()).optional(),
    reviewer_ids: z.array(z.number()).optional(),
    milestone_id: z.number().optional(),
    remove_source_branch: z.boolean().optional(),
    squash: z.boolean().optional(),
    allow_collaboration: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    iid: z.number(),
    project_id: z.number(),
    title: z.string(),
    description: z.string().nullable().optional(),
    state: z.string(),
    source_branch: z.string(),
    target_branch: z.string(),
    web_url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    author: z
        .object({
            id: z.number(),
            name: z.string(),
            username: z.string()
        })
        .optional()
});

const action = createAction({
    description: 'Create a merge request in GitLab',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/create-merge-request' },
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://docs.gitlab.com/api/merge_requests/#create-mr
            endpoint: `/api/v4/projects/${encodeURIComponent(String(input.project_id))}/merge_requests`,
            data: {
                source_branch: input.source_branch,
                target_branch: input.target_branch,
                title: input.title,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.labels !== undefined && { labels: input.labels }),
                ...(input.assignee_ids !== undefined && { assignee_ids: input.assignee_ids }),
                ...(input.reviewer_ids !== undefined && { reviewer_ids: input.reviewer_ids }),
                ...(input.milestone_id !== undefined && { milestone_id: input.milestone_id }),
                ...(input.remove_source_branch !== undefined && { remove_source_branch: input.remove_source_branch }),
                ...(input.squash !== undefined && { squash: input.squash }),
                ...(input.allow_collaboration !== undefined && { allow_collaboration: input.allow_collaboration })
            },
            retries: 3
        };

        // https://docs.gitlab.com/api/merge_requests/#create-mr
        const response = await nango.post(config);
        return OutputSchema.parse(response.data);
    }
});

export default action;
