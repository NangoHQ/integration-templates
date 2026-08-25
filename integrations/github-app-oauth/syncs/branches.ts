import { createSync, type ProxyConfiguration } from 'nango';
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

const GitHubRepositorySchema = z.object({
    owner: z.object({
        login: z.string()
    }),
    name: z.string()
});

const BranchSchema = z
    .object({
        id: z.string().describe('Stable identifier for the branch, qualified by repository owner and name.'),
        name: z.string().describe('The name of the branch.'),
        repo_owner: z.string().describe('The owner (user or organization) of the repository this branch belongs to.'),
        repo_name: z.string().describe('The name of the repository this branch belongs to.'),
        commit_sha: z.string().describe('The SHA of the latest commit on this branch.'),
        commit_url: z.string().optional().describe('The API URL for the latest commit on this branch.'),
        protected: z.boolean().describe('Whether the branch is protected from force pushes and deletions.'),
        protection_url: z.string().optional().describe('The API URL for the branch protection settings, if any.')
    })
    .describe('A git branch in a GitHub repository.');

const CheckpointSchema = z.object({
    repo_page: z.number().int().positive(),
    repo_index: z.number().int().nonnegative(),
    branch_page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync branches for a repository.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Branch: BranchSchema
    },

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw != null ? CheckpointSchema.parse(checkpointRaw) : undefined;

        // https://docs.github.com/en/rest/reference/apps#list-repositories-accessible-to-the-app-installation
        // repo_index addresses the complete repository list, so always rebuild that list
        // from page 1 before applying the saved index.
        let repoPage = 1;
        const repositories: Array<{ owner: string; name: string }> = [];
        while (true) {
            const repoResponse = await nango.get({
                endpoint: '/installation/repositories',
                params: {
                    per_page: 100,
                    ...(repoPage > 1 ? { page: repoPage } : {})
                },
                retries: 3
            });

            const batch = z.array(z.unknown()).parse(repoResponse.data.repositories);
            if (batch.length === 0) {
                break;
            }

            for (const raw of batch) {
                const parsed = GitHubRepositorySchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse repository: ${parsed.error.message}`);
                }
                repositories.push({ owner: parsed.data.owner.login, name: parsed.data.name });
            }

            if (batch.length < 100) {
                break;
            }

            repoPage++;
        }

        if (repositories.length === 0) {
            // An empty response may be transient rather than a genuine "installation has no
            // repositories" state. Skip the run instead of reconciling away every synced branch.
            await nango.log('No repositories accessible to this installation; skipping this run.', { level: 'warn' });
            return;
        }

        await nango.trackDeletesStart('Branch');

        const startIndex = checkpoint != null ? checkpoint['repo_index'] : 0;

        for (let i = startIndex; i < repositories.length; i++) {
            const repo = repositories[i];
            if (repo == null) {
                throw new Error(`Repository index ${i} is out of bounds`);
            }
            const owner = repo.owner;
            const repoName = repo.name;
            let nextBranchPage: number | undefined;

            const branchesConfig: ProxyConfiguration = {
                // https://docs.github.com/en/rest/branches/branches#list-branches
                endpoint: `repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/branches`,
                params: {
                    per_page: 100,
                    ...(checkpoint != null && checkpoint['branch_page'] > 1 && i === startIndex ? { page: checkpoint['branch_page'] } : {})
                },
                paginate: {
                    type: 'link',
                    limit_name_in_request: 'per_page',
                    limit: 100,
                    on_page: async (paginationState) => {
                        if (typeof paginationState.nextPageParam === 'string') {
                            const url = new URL(paginationState.nextPageParam);
                            nextBranchPage = Number(url.searchParams.get('page'));
                        } else {
                            nextBranchPage = undefined;
                        }
                    }
                },
                retries: 3
            };

            for await (const page of nango.paginate(branchesConfig)) {
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
                        id: `${owner}/${repoName}/${parsed.data.name}`,
                        name: parsed.data.name,
                        repo_owner: owner,
                        repo_name: repoName,
                        commit_sha: parsed.data.commit.sha,
                        commit_url: parsed.data.commit.url,
                        protected: parsed.data.protected,
                        protection_url: parsed.data.protection_url
                    });
                }

                if (branches.length > 0) {
                    await nango.batchSave(branches, 'Branch');
                }

                if (nextBranchPage !== undefined) {
                    await nango.saveCheckpoint({
                        repo_page: repoPage,
                        repo_index: i,
                        branch_page: nextBranchPage
                    });
                }
            }

            await nango.saveCheckpoint({ repo_page: repoPage, repo_index: i + 1, branch_page: 1 });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Branch');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
