import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    repo_full_name: z.string(),
    page: z.number().int().positive()
});

const BranchSchema = z
    .object({
        id: z.string().describe('The stable identifier for the branch, formatted as "{repo_owner}/{repo_name}:{name}" to stay unique across repositories.'),
        name: z.string().describe('The name of the branch.'),
        repo_owner: z.string().describe('The login of the user or organization that owns the repository.'),
        repo_name: z.string().describe('The name of the repository this branch belongs to.'),
        commit_sha: z.string().describe('The SHA hash of the latest commit on this branch.'),
        commit_url: z.string().describe('The API URL for the latest commit object on this branch.'),
        protected: z.boolean().describe('Whether the branch is protected by branch protection rules.')
    })
    .describe('Represents a Git repository branch, including its latest commit and protection status.');

const BranchResponseSchema = z.object({
    name: z.string(),
    commit: z.object({
        sha: z.string(),
        url: z.string()
    }),
    protected: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync branches for a repository.',
    version: '1.0.2',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Branch: BranchSchema
    },
    scopes: ['contents:read'],
    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse({
            repo_full_name: '',
            page: 1,
            ...(rawCheckpoint && typeof rawCheckpoint === 'object' ? rawCheckpoint : {})
        });

        const RepoSchema = z.object({
            name: z.string(),
            owner: z.object({
                login: z.string()
            })
        });

        const repos: Array<z.infer<typeof RepoSchema>> = [];
        // https://docs.github.com/rest/apps/installations#list-repositories-accessible-to-the-app-installation
        for await (const repoBatch of nango.paginate({
            endpoint: '/installation/repositories',
            paginate: {
                type: 'link',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'repositories',
                link_rel_in_response_header: 'next'
            },
            retries: 3
        })) {
            repos.push(...z.array(RepoSchema).parse(repoBatch));
        }

        if (repos.length === 0) {
            return;
        }

        await nango.trackDeletesStart('Branch');

        const firstRepo = repos[0];
        const checkpointRepoFullName = checkpoint.repo_full_name ?? (firstRepo ? `${firstRepo.owner.login}/${firstRepo.name}` : undefined);
        const resumeRepoIndex = checkpointRepoFullName
            ? Math.max(
                  repos.findIndex((repo) => `${repo.owner.login}/${repo.name}` === checkpointRepoFullName),
                  0
              )
            : 0;

        for (let repoIndex = resumeRepoIndex; repoIndex < repos.length; repoIndex++) {
            const repo = repos[repoIndex];
            if (!repo) {
                continue;
            }
            const owner = repo.owner.login;
            const repoName = repo.name;
            const repoFullName = `${owner}/${repoName}`;
            let currentPage = repoFullName === checkpointRepoFullName ? checkpoint.page : 1;

            const proxyConfig: ProxyConfiguration = {
                // https://docs.github.com/rest/branches/branches#list-branches
                endpoint: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/branches`,
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: currentPage,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'per_page',
                    limit: 100
                },
                retries: 3
            };

            for await (const branchBatch of nango.paginate(proxyConfig)) {
                const validated = z.array(BranchResponseSchema).parse(branchBatch);

                const branches = validated.map((branch) => ({
                    id: `${repoFullName}:${branch.name}`,
                    name: branch.name,
                    repo_owner: owner,
                    repo_name: repoName,
                    commit_sha: branch.commit.sha,
                    commit_url: branch.commit.url,
                    protected: branch.protected ?? false
                }));

                if (branches.length > 0) {
                    await nango.batchSave(branches, 'Branch');
                }

                currentPage += 1;
                await nango.saveCheckpoint({ repo_full_name: repoFullName, page: currentPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Branch');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
