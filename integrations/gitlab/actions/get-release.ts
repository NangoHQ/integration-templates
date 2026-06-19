import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.union([z.string(), z.number()]).describe('The ID or URL-encoded path of the project. Example: "82599306"'),
    tag_name: z.string().describe('The Git tag the release is associated with. Example: "v1.0.0"')
});

const ProviderAuthorSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    username: z.string().optional(),
    state: z.string().optional(),
    avatar_url: z.string().optional(),
    web_url: z.string().optional()
});

const ProviderCommitSchema = z.object({
    id: z.string(),
    short_id: z.string().optional(),
    title: z.string().optional(),
    created_at: z.string().optional(),
    parent_ids: z.array(z.string()).optional(),
    message: z.string().optional(),
    author_name: z.string().optional(),
    author_email: z.string().optional(),
    authored_date: z.string().optional(),
    committer_name: z.string().optional(),
    committer_email: z.string().optional(),
    committed_date: z.string().optional()
});

const ProviderMilestoneSchema = z.object({
    id: z.number(),
    iid: z.number().optional(),
    project_id: z.number().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    state: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    due_date: z.string().optional(),
    start_date: z.string().optional(),
    web_url: z.string().optional(),
    issue_stats: z
        .object({
            total: z.number().optional(),
            closed: z.number().optional(),
            opened: z.number().optional()
        })
        .optional()
});

const ProviderAssetSourceSchema = z.object({
    format: z.string().optional(),
    url: z.string().optional()
});

const ProviderAssetLinkSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    url: z.string().optional(),
    link_type: z.string().optional(),
    direct_asset_path: z.string().optional()
});

const ProviderAssetsSchema = z.object({
    count: z.number().optional(),
    sources: z.array(ProviderAssetSourceSchema).optional(),
    links: z.array(ProviderAssetLinkSchema).optional(),
    evidence_file_path: z.string().optional()
});

const ProviderEvidenceSchema = z.object({
    sha: z.string().optional(),
    filepath: z.string().optional(),
    collected_at: z.string().optional()
});

const ProviderLinksSchema = z.object({
    closed_issues_url: z.string().optional(),
    closed_merge_requests_url: z.string().optional(),
    edit_url: z.string().optional(),
    merged_merge_requests_url: z.string().optional(),
    opened_issues_url: z.string().optional(),
    opened_merge_requests_url: z.string().optional(),
    self: z.string().optional()
});

const ProviderReleaseSchema = z.object({
    tag_name: z.string(),
    description: z.string().optional(),
    name: z.string().optional(),
    created_at: z.string().optional(),
    released_at: z.string().optional(),
    author: ProviderAuthorSchema.optional(),
    commit: ProviderCommitSchema.optional(),
    milestones: z.array(ProviderMilestoneSchema).optional(),
    commit_path: z.string().optional(),
    tag_path: z.string().optional(),
    assets: ProviderAssetsSchema.optional(),
    evidences: z.array(ProviderEvidenceSchema).optional(),
    evidence_sha: z.string().optional(),
    upcoming_release: z.boolean().optional(),
    historical_release: z.boolean().optional(),
    _links: ProviderLinksSchema.optional()
});

const OutputSchema = ProviderReleaseSchema;

const action = createAction({
    description: 'Retrieve a single release from GitLab.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input) => {
        const projectId = typeof input.project_id === 'number' ? String(input.project_id) : input.project_id;
        // https://docs.gitlab.com/api/releases/#get-a-release-by-a-tag-name
        const response = await nango.get({
            endpoint: `/api/v4/projects/${encodeURIComponent(projectId)}/releases/${encodeURIComponent(input.tag_name)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Release not found',
                project_id: input.project_id,
                tag_name: input.tag_name
            });
        }

        const providerRelease = ProviderReleaseSchema.parse(response.data);

        return providerRelease;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
