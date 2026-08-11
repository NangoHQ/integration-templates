import { createSync } from 'nango';
import { z } from 'zod';

const GitHubCommitSchema = z.object({
    sha: z.string(),
    url: z.string().optional()
});

const GitHubBranchSchema = z.object({
    name: z.string(),
    commit: GitHubCommitSchema,
    protected: z.boolean(),
    protection_url: z.string().optional()
});

const GitHubRepoListSchema = z.object({
    repositories: z.array(
        z.object({
            owner: z.object({
                login: z.string()
            }),
            name: z.string()
        })
    )
});

const BranchSchema = z
    .object({
        id: z.string().describe('Stable identifier for the branch, using the branch name.'),
        name: z.string().describe('The name of the branch.'),
        repo_owner: z.string().describe('The owner (user or organization) of the repository this branch belongs to.'),
        repo_name: z.string().describe('The name of the repository this branch belongs to.'),
        commit_sha: z.string().describe('The SHA of the latest commit on this branch.'),
        commit_url: z.string().optional().describe('The API URL for the latest commit on this branch.'),
        protected: z.boolean().describe('Whether the branch is protected from force pushes and deletions.'),
        protection_url: z.string().optional().describe('The API URL for the branch protection settings, if any.')
    })
    .describe('A git branch in a GitHub repository.');

const sync = createSync({
    description: 'Sync branches for a repository.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Branch: BranchSchema
    },

    exec: async (nango) => {
        // https://docs.github.com/en/rest/reference/apps#list-repositories-accessible-to-the-app-installation
        const reposResponse = await nango.get({
            endpoint: '/installation/repositories',
            params: {
                per_page: 100
            },
            retries: 3
        });

        const reposParsed = GitHubRepoListSchema.safeParse(reposResponse.data);
        if (!reposParsed.success) {
            throw new Error(`Failed to parse repository list: ${reposParsed.error.message}`);
        }

        const repositories = reposParsed.data.repositories;
        if (repositories.length === 0) {
            throw new Error('No repositories accessible to this installation');
        }

        const firstRepo = repositories[0];
        if (!firstRepo) {
            throw new Error('No repositories accessible to this installation');
        }

        const owner = firstRepo.owner.login;
        const repo = firstRepo.name;

        await nango.trackDeletesStart('Branch');

        // https://docs.github.com/en/rest/branches/branches#list-branches
        for await (const page of nango.paginate({
            endpoint: `repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`,
            paginate: {
                type: 'link',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        })) {
            if (!Array.isArray(page)) {
                throw new Error('Unexpected non-array page from paginate');
            }

            const branches = [];
            for (const branch of page) {
                const parsed = GitHubBranchSchema.safeParse(branch);
                if (!parsed.success) {
                    throw new Error(`Failed to parse branch: ${parsed.error.message}`);
                }

                branches.push({
                    id: parsed.data.name,
                    name: parsed.data.name,
                    repo_owner: owner,
                    repo_name: repo,
                    commit_sha: parsed.data.commit.sha,
                    commit_url: parsed.data.commit.url,
                    protected: parsed.data.protected,
                    protection_url: parsed.data.protection_url
                });
            }

            if (branches.length > 0) {
                await nango.batchSave(branches, 'Branch');
            }
        }

        await nango.trackDeletesEnd('Branch');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
