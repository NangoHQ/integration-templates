import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner login. Example: "NangoHQ"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        name: z.string().optional().describe('New repository name. Renaming changes the repository URLs; GitHub redirects the old URLs to the new ones.'),
        description: z
            .string()
            .nullable()
            .optional()
            .describe('Short repository description. Example: "Build product integrations with AI." Pass null to clear it.'),
        homepage: z.string().nullable().optional().describe('Repository homepage URL. Example: "https://nango.dev". Pass null to clear it.'),
        private: z.boolean().optional().describe('Whether the repository is private. Cannot be combined with visibility in the same request.'),
        visibility: z
            .enum(['public', 'private', 'internal'])
            .optional()
            .describe(
                'Repository visibility. "internal" is only available to organizations on GitHub Enterprise Cloud. Cannot be combined with private in the same request.'
            ),
        has_issues: z.boolean().optional().describe('Whether the Issues feature is enabled.'),
        has_projects: z.boolean().optional().describe('Whether the Projects feature is enabled.'),
        has_wiki: z.boolean().optional().describe('Whether the wiki is enabled.'),
        has_discussions: z.boolean().optional().describe('Whether Discussions are enabled.'),
        is_template: z.boolean().optional().describe('Whether the repository is a template repository others can generate from.'),
        default_branch: z.string().optional().describe('Default branch name. Example: "main"'),
        allow_squash_merge: z.boolean().optional().describe('Whether squash-merging pull requests is allowed.'),
        allow_merge_commit: z.boolean().optional().describe('Whether merging pull requests with a merge commit is allowed.'),
        allow_rebase_merge: z.boolean().optional().describe('Whether rebase-merging pull requests is allowed.'),
        allow_auto_merge: z.boolean().optional().describe('Whether auto-merge on pull requests is allowed.'),
        delete_branch_on_merge: z.boolean().optional().describe('Whether head branches are automatically deleted when a pull request is merged.'),
        allow_update_branch: z.boolean().optional().describe('Whether pull request branches can be updated from the default branch with a button.'),
        allow_forking: z.boolean().optional().describe('Whether the repository can be forked.'),
        web_commit_signoff_required: z.boolean().optional().describe('Whether commits made through the GitHub web UI require a sign-off trailer.'),
        squash_merge_commit_title: z
            .enum(['PR_TITLE', 'COMMIT_OR_PR_TITLE'])
            .optional()
            .describe('Default title for squash merge commits. Possible values: "PR_TITLE", "COMMIT_OR_PR_TITLE".'),
        squash_merge_commit_message: z
            .enum(['PR_BODY', 'COMMIT_MESSAGES', 'BLANK'])
            .optional()
            .describe('Default message for squash merge commits. Possible values: "PR_BODY", "COMMIT_MESSAGES", "BLANK".'),
        merge_commit_title: z
            .enum(['PR_TITLE', 'MERGE_MESSAGE'])
            .optional()
            .describe('Default title for merge commits. Possible values: "PR_TITLE", "MERGE_MESSAGE".'),
        merge_commit_message: z
            .enum(['PR_BODY', 'PR_TITLE', 'BLANK'])
            .optional()
            .describe('Default message for merge commits. Possible values: "PR_BODY", "PR_TITLE", "BLANK".'),
        archived: z.boolean().optional().describe('Whether the repository is archived. Archiving makes the repository read-only until it is unarchived.')
    })
    .describe('Repository settings to update. Provide owner and repo plus at least one settings field; omitted fields are left unchanged.');

const ProviderRepositorySchema = z.object({
    id: z.number(),
    node_id: z.string(),
    name: z.string(),
    full_name: z.string(),
    owner: z.object({
        login: z.string(),
        id: z.number()
    }),
    description: z.string().nullable().optional(),
    homepage: z.string().nullable().optional(),
    private: z.boolean(),
    visibility: z.string().optional(),
    has_issues: z.boolean().optional(),
    has_projects: z.boolean().optional(),
    has_wiki: z.boolean().optional(),
    has_discussions: z.boolean().optional(),
    has_pages: z.boolean().optional(),
    is_template: z.boolean().optional(),
    default_branch: z.string(),
    archived: z.boolean(),
    disabled: z.boolean().optional(),
    allow_squash_merge: z.boolean().optional(),
    allow_merge_commit: z.boolean().optional(),
    allow_rebase_merge: z.boolean().optional(),
    allow_auto_merge: z.boolean().optional(),
    delete_branch_on_merge: z.boolean().optional(),
    allow_update_branch: z.boolean().optional(),
    allow_forking: z.boolean().optional(),
    web_commit_signoff_required: z.boolean().optional(),
    squash_merge_commit_title: z.string().optional(),
    squash_merge_commit_message: z.string().optional(),
    merge_commit_title: z.string().optional(),
    merge_commit_message: z.string().optional(),
    html_url: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('GitHub repository ID. Example: 1330859455'),
        node_id: z.string().describe('GitHub node ID of the repository. Example: "R_kgDOT1NNvw"'),
        name: z.string().describe('Repository name. Example: "nango"'),
        full_name: z.string().describe('Full repository name including the owner. Example: "NangoHQ/nango"'),
        owner: z.string().describe('Login of the repository owner. Example: "NangoHQ"'),
        description: z.string().optional().describe('Repository description. Omitted when unset.'),
        homepage: z.string().optional().describe('Repository homepage URL. Omitted when unset.'),
        private: z.boolean().describe('Whether the repository is private.'),
        visibility: z.string().optional().describe('Repository visibility. Possible values: "public", "private", "internal".'),
        has_issues: z.boolean().optional().describe('Whether the Issues feature is enabled.'),
        has_projects: z.boolean().optional().describe('Whether the Projects feature is enabled.'),
        has_wiki: z.boolean().optional().describe('Whether the wiki is enabled.'),
        has_discussions: z.boolean().optional().describe('Whether Discussions are enabled.'),
        has_pages: z.boolean().optional().describe('Whether GitHub Pages is enabled for the repository.'),
        is_template: z.boolean().optional().describe('Whether the repository is a template repository.'),
        default_branch: z.string().describe('Default branch name. Example: "main"'),
        archived: z.boolean().describe('Whether the repository is archived.'),
        disabled: z.boolean().optional().describe('Whether the repository has been disabled by GitHub (e.g. for exceeding usage limits).'),
        allow_squash_merge: z.boolean().optional().describe('Whether squash-merging pull requests is allowed.'),
        allow_merge_commit: z.boolean().optional().describe('Whether merging pull requests with a merge commit is allowed.'),
        allow_rebase_merge: z.boolean().optional().describe('Whether rebase-merging pull requests is allowed.'),
        allow_auto_merge: z.boolean().optional().describe('Whether auto-merge on pull requests is allowed.'),
        delete_branch_on_merge: z.boolean().optional().describe('Whether head branches are automatically deleted when a pull request is merged.'),
        allow_update_branch: z.boolean().optional().describe('Whether pull request branches can be updated from the default branch.'),
        allow_forking: z.boolean().optional().describe('Whether the repository can be forked.'),
        web_commit_signoff_required: z.boolean().optional().describe('Whether web UI commits require a sign-off trailer.'),
        squash_merge_commit_title: z.string().optional().describe('Default title for squash merge commits. Possible values: "PR_TITLE", "COMMIT_OR_PR_TITLE".'),
        squash_merge_commit_message: z
            .string()
            .optional()
            .describe('Default message for squash merge commits. Possible values: "PR_BODY", "COMMIT_MESSAGES", "BLANK".'),
        merge_commit_title: z.string().optional().describe('Default title for merge commits. Possible values: "PR_TITLE", "MERGE_MESSAGE".'),
        merge_commit_message: z.string().optional().describe('Default message for merge commits. Possible values: "PR_BODY", "PR_TITLE", "BLANK".'),
        html_url: z.string().describe('Web URL of the repository. Example: "https://github.com/NangoHQ/nango"'),
        created_at: z.string().optional().describe('ISO 8601 creation timestamp. Example: "2020-04-09T09:31:24Z"'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp of the last repository update. Example: "2026-09-28T12:18:37Z"')
    })
    .describe('The repository with its settings after the update.');

/**
 * @tags: [write]
 * @tagReason: Mutates repository settings through a provider PATCH; every field is a reversible configuration update with no deletes or revocations.
 * @pitfalls: Requires the GitHub App "Administration" repository permission (write); installations without it fail with a 403. Archiving makes the repository read-only until it is unarchived, renaming changes the repository URLs (GitHub redirects the old ones), and private cannot be combined with visibility in the same request.
 */
const action = createAction({
    description: 'Update repository-level settings such as description, homepage, default branch, feature toggles, merge options, and archived state.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['administration:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#update-a-repository
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
                ...(input.has_discussions !== undefined && { has_discussions: input.has_discussions }),
                ...(input.is_template !== undefined && { is_template: input.is_template }),
                ...(input.default_branch !== undefined && { default_branch: input.default_branch }),
                ...(input.allow_squash_merge !== undefined && { allow_squash_merge: input.allow_squash_merge }),
                ...(input.allow_merge_commit !== undefined && { allow_merge_commit: input.allow_merge_commit }),
                ...(input.allow_rebase_merge !== undefined && { allow_rebase_merge: input.allow_rebase_merge }),
                ...(input.allow_auto_merge !== undefined && { allow_auto_merge: input.allow_auto_merge }),
                ...(input.delete_branch_on_merge !== undefined && { delete_branch_on_merge: input.delete_branch_on_merge }),
                ...(input.allow_update_branch !== undefined && { allow_update_branch: input.allow_update_branch }),
                ...(input.allow_forking !== undefined && { allow_forking: input.allow_forking }),
                ...(input.web_commit_signoff_required !== undefined && { web_commit_signoff_required: input.web_commit_signoff_required }),
                ...(input.squash_merge_commit_title !== undefined && { squash_merge_commit_title: input.squash_merge_commit_title }),
                ...(input.squash_merge_commit_message !== undefined && { squash_merge_commit_message: input.squash_merge_commit_message }),
                ...(input.merge_commit_title !== undefined && { merge_commit_title: input.merge_commit_title }),
                ...(input.merge_commit_message !== undefined && { merge_commit_message: input.merge_commit_message }),
                ...(input.archived !== undefined && { archived: input.archived })
            },
            retries: 3
        };
        const response = await nango.patch(config);

        const repository = ProviderRepositorySchema.parse(response.data);

        return {
            id: repository.id,
            node_id: repository.node_id,
            name: repository.name,
            full_name: repository.full_name,
            owner: repository.owner.login,
            private: repository.private,
            default_branch: repository.default_branch,
            archived: repository.archived,
            html_url: repository.html_url,
            ...(repository.description != null && { description: repository.description }),
            ...(repository.homepage != null && { homepage: repository.homepage }),
            ...(repository.visibility !== undefined && { visibility: repository.visibility }),
            ...(repository.has_issues !== undefined && { has_issues: repository.has_issues }),
            ...(repository.has_projects !== undefined && { has_projects: repository.has_projects }),
            ...(repository.has_wiki !== undefined && { has_wiki: repository.has_wiki }),
            ...(repository.has_discussions !== undefined && { has_discussions: repository.has_discussions }),
            ...(repository.has_pages !== undefined && { has_pages: repository.has_pages }),
            ...(repository.is_template !== undefined && { is_template: repository.is_template }),
            ...(repository.disabled !== undefined && { disabled: repository.disabled }),
            ...(repository.allow_squash_merge !== undefined && { allow_squash_merge: repository.allow_squash_merge }),
            ...(repository.allow_merge_commit !== undefined && { allow_merge_commit: repository.allow_merge_commit }),
            ...(repository.allow_rebase_merge !== undefined && { allow_rebase_merge: repository.allow_rebase_merge }),
            ...(repository.allow_auto_merge !== undefined && { allow_auto_merge: repository.allow_auto_merge }),
            ...(repository.delete_branch_on_merge !== undefined && { delete_branch_on_merge: repository.delete_branch_on_merge }),
            ...(repository.allow_update_branch !== undefined && { allow_update_branch: repository.allow_update_branch }),
            ...(repository.allow_forking !== undefined && { allow_forking: repository.allow_forking }),
            ...(repository.web_commit_signoff_required !== undefined && { web_commit_signoff_required: repository.web_commit_signoff_required }),
            ...(repository.squash_merge_commit_title !== undefined && { squash_merge_commit_title: repository.squash_merge_commit_title }),
            ...(repository.squash_merge_commit_message !== undefined && { squash_merge_commit_message: repository.squash_merge_commit_message }),
            ...(repository.merge_commit_title !== undefined && { merge_commit_title: repository.merge_commit_title }),
            ...(repository.merge_commit_message !== undefined && { merge_commit_message: repository.merge_commit_message }),
            ...(repository.created_at !== undefined && { created_at: repository.created_at }),
            ...(repository.updated_at !== undefined && { updated_at: repository.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
