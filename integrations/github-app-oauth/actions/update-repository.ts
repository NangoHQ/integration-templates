import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive.'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case sensitive.'),
        name: z.string().optional().describe('The new name of the repository.'),
        description: z.string().nullable().optional().describe('A short description of the repository. Pass null to clear.'),
        homepage: z.string().nullable().optional().describe('A URL with more information about the repository. Pass null to clear.'),
        private: z.boolean().optional().describe('Either true to make the repository private or false to make it public.'),
        visibility: z.enum(['public', 'private']).optional().describe('The visibility of the repository.'),
        has_issues: z.boolean().optional().describe('Either true to enable issues for this repository or false to disable them.'),
        has_projects: z.boolean().optional().describe('Either true to enable projects for this repository or false to disable them.'),
        has_wiki: z.boolean().optional().describe('Either true to enable the wiki for this repository or false to disable it.'),
        has_pull_requests: z.boolean().optional().describe('Either true to allow pull requests for this repository or false to prevent them.'),
        pull_request_creation_policy: z
            .enum(['all', 'collaborators_only'])
            .optional()
            .describe('The policy that controls who can create pull requests for this repository.'),
        is_template: z.boolean().optional().describe('Either true to make this repo available as a template repository or false to prevent it.'),
        default_branch: z.string().optional().describe('Updates the default branch for this repository.'),
        allow_squash_merge: z.boolean().optional().describe('Either true to allow squash-merging pull requests or false to prevent squash-merging.'),
        allow_merge_commit: z.boolean().optional().describe('Either true to allow merging pull requests with a merge commit or false to prevent it.'),
        allow_rebase_merge: z.boolean().optional().describe('Either true to allow rebase-merging pull requests or false to prevent it.'),
        allow_auto_merge: z.boolean().optional().describe('Either true to allow auto-merge on pull requests or false to disallow it.'),
        delete_branch_on_merge: z
            .boolean()
            .optional()
            .describe('Either true to allow automatically deleting head branches when pull requests are merged or false to prevent it.'),
        allow_update_branch: z
            .boolean()
            .optional()
            .describe('Either true to always allow a pull request head branch that is behind its base branch to be updated or false otherwise.'),
        squash_merge_commit_title: z.enum(['PR_TITLE', 'COMMIT_OR_PR_TITLE']).optional().describe('The default value for a squash merge commit title.'),
        squash_merge_commit_message: z
            .enum(['PR_BODY', 'COMMIT_MESSAGES', 'BLANK'])
            .optional()
            .describe('The default value for a squash merge commit message.'),
        merge_commit_title: z.enum(['PR_TITLE', 'MERGE_MESSAGE']).optional().describe('The default value for a merge commit title.'),
        merge_commit_message: z.enum(['PR_BODY', 'PR_TITLE', 'BLANK']).optional().describe('The default value for a merge commit message.'),
        archived: z.boolean().optional().describe('Whether to archive this repository. false will unarchive a previously archived repository.'),
        allow_forking: z.boolean().optional().describe('Either true to allow private forks or false to prevent them.'),
        web_commit_signoff_required: z.boolean().optional().describe('Either true to require contributors to sign off on web-based commits or false otherwise.')
    })
    .describe('Input parameters for updating a GitHub repository.');

const ProviderOwnerSchema = z.object({
    login: z.string(),
    id: z.number()
});

const ProviderRepositorySchema = z.object({
    id: z.number(),
    node_id: z.string(),
    name: z.string(),
    full_name: z.string(),
    owner: ProviderOwnerSchema,
    private: z.boolean(),
    html_url: z.string(),
    description: z.string().nullable(),
    default_branch: z.string(),
    has_issues: z.boolean(),
    has_projects: z.boolean(),
    has_wiki: z.boolean(),
    has_pages: z.boolean(),
    has_discussions: z.boolean(),
    archived: z.boolean(),
    disabled: z.boolean(),
    visibility: z.string(),
    allow_squash_merge: z.boolean().optional(),
    allow_merge_commit: z.boolean().optional(),
    allow_rebase_merge: z.boolean().optional(),
    allow_auto_merge: z.boolean().optional(),
    delete_branch_on_merge: z.boolean().optional(),
    allow_update_branch: z.boolean().optional(),
    updated_at: z.string().nullable()
});

const OwnerSchema = z.object({
    login: z.string().describe('The login name of the owner.'),
    id: z.number().describe('The unique identifier of the owner.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the repository.'),
        node_id: z.string().describe('The GraphQL node ID for the repository.'),
        name: z.string().describe('The name of the repository.'),
        full_name: z.string().describe('The full name of the repository including the owner.'),
        owner: OwnerSchema.describe('The account owner of the repository.'),
        private: z.boolean().describe('Whether the repository is private.'),
        html_url: z.string().describe('The URL to view the repository on GitHub.'),
        description: z.string().optional().describe('A short description of the repository.'),
        default_branch: z.string().describe('The default branch of the repository.'),
        has_issues: z.boolean().describe('Whether issues are enabled.'),
        has_projects: z.boolean().describe('Whether projects are enabled.'),
        has_wiki: z.boolean().describe('Whether the wiki is enabled.'),
        has_pages: z.boolean().describe('Whether GitHub Pages is enabled.'),
        has_discussions: z.boolean().describe('Whether discussions are enabled.'),
        archived: z.boolean().describe('Whether the repository is archived.'),
        disabled: z.boolean().describe('Whether the repository is disabled.'),
        visibility: z.string().describe('The visibility of the repository.'),
        allow_squash_merge: z.boolean().optional().describe('Whether squash-merging pull requests is allowed.'),
        allow_merge_commit: z.boolean().optional().describe('Whether merging pull requests with a merge commit is allowed.'),
        allow_rebase_merge: z.boolean().optional().describe('Whether rebase-merging pull requests is allowed.'),
        allow_auto_merge: z.boolean().optional().describe('Whether auto-merge is allowed.'),
        delete_branch_on_merge: z.boolean().optional().describe('Whether head branches are automatically deleted when pull requests are merged.'),
        allow_update_branch: z.boolean().optional().describe('Whether pull request head branches behind the base branch can be updated.'),
        updated_at: z.string().optional().describe('When the repository was last updated.')
    })
    .describe('The updated GitHub repository object.');

/**
 * @tags: [write]
 * @tagReason: Updates repository-level settings via a PATCH request to the provider.
 * @pitfalls: Requires the administration repository permission; installations without it will receive a 403. Setting delete_branch_on_merge to true requires the caller to be an organization owner. Changing repository visibility can be blocked by organization policy, producing a 422.
 */
const action = createAction({
    description: 'Update repository-level settings (description, default branch, features toggles, etc).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['administration:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://docs.github.com/en/rest/repos/repos#update-a-repository
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.homepage !== undefined && { homepage: input.homepage }),
                ...(input.private !== undefined && { private: input.private }),
                ...(input.visibility !== undefined && { visibility: input.visibility }),
                ...(input.has_issues !== undefined && { has_issues: input.has_issues }),
                ...(input.has_projects !== undefined && { has_projects: input.has_projects }),
                ...(input.has_wiki !== undefined && { has_wiki: input.has_wiki }),
                ...(input.has_pull_requests !== undefined && { has_pull_requests: input.has_pull_requests }),
                ...(input.pull_request_creation_policy !== undefined && { pull_request_creation_policy: input.pull_request_creation_policy }),
                ...(input.is_template !== undefined && { is_template: input.is_template }),
                ...(input.default_branch !== undefined && { default_branch: input.default_branch }),
                ...(input.allow_squash_merge !== undefined && { allow_squash_merge: input.allow_squash_merge }),
                ...(input.allow_merge_commit !== undefined && { allow_merge_commit: input.allow_merge_commit }),
                ...(input.allow_rebase_merge !== undefined && { allow_rebase_merge: input.allow_rebase_merge }),
                ...(input.allow_auto_merge !== undefined && { allow_auto_merge: input.allow_auto_merge }),
                ...(input.delete_branch_on_merge !== undefined && { delete_branch_on_merge: input.delete_branch_on_merge }),
                ...(input.allow_update_branch !== undefined && { allow_update_branch: input.allow_update_branch }),
                ...(input.squash_merge_commit_title !== undefined && { squash_merge_commit_title: input.squash_merge_commit_title }),
                ...(input.squash_merge_commit_message !== undefined && { squash_merge_commit_message: input.squash_merge_commit_message }),
                ...(input.merge_commit_title !== undefined && { merge_commit_title: input.merge_commit_title }),
                ...(input.merge_commit_message !== undefined && { merge_commit_message: input.merge_commit_message }),
                ...(input.archived !== undefined && { archived: input.archived }),
                ...(input.allow_forking !== undefined && { allow_forking: input.allow_forking }),
                ...(input.web_commit_signoff_required !== undefined && { web_commit_signoff_required: input.web_commit_signoff_required })
            },
            retries: 1
        });

        const providerRepo = ProviderRepositorySchema.parse(response.data);

        return {
            id: providerRepo.id,
            node_id: providerRepo.node_id,
            name: providerRepo.name,
            full_name: providerRepo.full_name,
            owner: {
                login: providerRepo.owner.login,
                id: providerRepo.owner.id
            },
            private: providerRepo.private,
            html_url: providerRepo.html_url,
            ...(providerRepo.description != null && { description: providerRepo.description }),
            default_branch: providerRepo.default_branch,
            has_issues: providerRepo.has_issues,
            has_projects: providerRepo.has_projects,
            has_wiki: providerRepo.has_wiki,
            has_pages: providerRepo.has_pages,
            has_discussions: providerRepo.has_discussions,
            archived: providerRepo.archived,
            disabled: providerRepo.disabled,
            visibility: providerRepo.visibility,
            ...(providerRepo.allow_squash_merge !== undefined && { allow_squash_merge: providerRepo.allow_squash_merge }),
            ...(providerRepo.allow_merge_commit !== undefined && { allow_merge_commit: providerRepo.allow_merge_commit }),
            ...(providerRepo.allow_rebase_merge !== undefined && { allow_rebase_merge: providerRepo.allow_rebase_merge }),
            ...(providerRepo.allow_auto_merge !== undefined && { allow_auto_merge: providerRepo.allow_auto_merge }),
            ...(providerRepo.delete_branch_on_merge !== undefined && { delete_branch_on_merge: providerRepo.delete_branch_on_merge }),
            ...(providerRepo.allow_update_branch !== undefined && { allow_update_branch: providerRepo.allow_update_branch }),
            ...(providerRepo.updated_at != null && { updated_at: providerRepo.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
