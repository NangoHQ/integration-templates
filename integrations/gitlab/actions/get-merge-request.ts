import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.union([z.number(), z.string()]).describe('The ID or URL-encoded path of the project. Example: 82599306'),
    merge_request_iid: z.number().describe('The internal ID of the merge request in the project. Example: 1')
});

const UserSchema = z.object({
    id: z.number(),
    name: z.string(),
    username: z.string(),
    state: z.string(),
    avatar_url: z.string().nullable().optional(),
    web_url: z.string().optional(),
    locked: z.boolean().optional(),
    public_email: z.string().nullable().optional()
});

const MilestoneSchema = z.object({
    id: z.number(),
    iid: z.number(),
    project_id: z.number().optional(),
    group_id: z.number().optional(),
    title: z.string(),
    description: z.string().nullable().optional(),
    state: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    due_date: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(),
    web_url: z.string().optional()
});

const ReferencesSchema = z.object({
    short: z.string(),
    relative: z.string(),
    full: z.string()
});

const TimeStatsSchema = z.object({
    time_estimate: z.number(),
    total_time_spent: z.number(),
    human_time_estimate: z.string().nullable().optional(),
    human_total_time_spent: z.string().nullable().optional()
});

const TaskCompletionStatusSchema = z.object({
    count: z.number(),
    completed_count: z.number()
});

const ProviderMergeRequestSchema = z.object({
    id: z.number(),
    iid: z.number(),
    project_id: z.number(),
    title: z.string(),
    description: z.string().nullable().optional(),
    state: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    target_branch: z.string(),
    source_branch: z.string(),
    upvotes: z.number(),
    downvotes: z.number(),
    author: UserSchema,
    assignee: UserSchema.nullable().optional(),
    assignees: z.array(UserSchema).optional(),
    reviewers: z.array(UserSchema).optional(),
    source_project_id: z.number(),
    target_project_id: z.number(),
    labels: z.array(z.string()).optional(),
    draft: z.boolean(),
    work_in_progress: z.boolean().optional(),
    milestone: MilestoneSchema.nullable().optional(),
    merge_when_pipeline_succeeds: z.boolean().optional(),
    merge_status: z.string().optional(),
    detailed_merge_status: z.string(),
    sha: z.string(),
    merge_commit_sha: z.string().nullable().optional(),
    squash_commit_sha: z.string().nullable().optional(),
    user_notes_count: z.number(),
    discussion_locked: z.boolean().nullable().optional(),
    should_remove_source_branch: z.boolean().nullable().optional(),
    force_remove_source_branch: z.boolean().nullable().optional(),
    allow_collaboration: z.boolean().optional(),
    allow_maintainer_to_push: z.boolean().optional(),
    web_url: z.string(),
    references: ReferencesSchema,
    time_stats: TimeStatsSchema,
    squash: z.boolean().optional(),
    squash_on_merge: z.boolean().optional(),
    task_completion_status: TaskCompletionStatusSchema,
    has_conflicts: z.boolean().optional(),
    blocking_discussions_resolved: z.boolean().optional(),
    closed_at: z.string().nullable().optional(),
    closed_by: UserSchema.nullable().optional(),
    merged_at: z.string().nullable().optional(),
    merge_user: UserSchema.nullable().optional(),
    merge_after: z.string().nullable().optional(),
    prepared_at: z.string().optional(),
    imported: z.boolean().optional(),
    imported_from: z.string().nullable().optional()
});

const OutputSchema = ProviderMergeRequestSchema;

const action = createAction({
    description: 'Retrieve a single merge request from GitLab.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-merge-request',
        group: 'Merge Requests'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.gitlab.com/api/merge_requests/#get-single-mr
            endpoint: `/api/v4/projects/${String(input.project_id)}/merge_requests/${input.merge_request_iid}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Merge request not found',
                project_id: input.project_id,
                merge_request_iid: input.merge_request_iid
            });
        }

        const mergeRequest = ProviderMergeRequestSchema.parse(response.data);
        return mergeRequest;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
