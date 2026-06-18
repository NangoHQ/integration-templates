import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const BranchSchema = z.object({
    id: z.string(),
    name: z.string(),
    workspace: z.string(),
    repo_slug: z.string(),
    target_hash: z.string().optional()
});

const WorkspaceItemSchema = z.object({
    workspace: z.object({
        slug: z.string()
    })
});

const RepositorySchema = z.object({
    slug: z.string()
});

const BranchResponseSchema = z.object({
    name: z.string(),
    target: z
        .object({
            hash: z.string()
        })
        .optional()
});

const BranchesResponseSchema = z.object({
    values: z.array(BranchResponseSchema),
    next: z.string().optional()
});

const CheckpointSchema = z.object({
    workspace_slug: z.string(),
    repo_slug: z.string(),
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync branches per repository',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Branch: BranchSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = checkpoint ? CheckpointSchema.safeParse(checkpoint) : null;
        const resumeWorkspaceSlug = parsedCheckpoint?.success ? parsedCheckpoint.data.workspace_slug : undefined;
        const resumeRepoSlug = parsedCheckpoint?.success ? parsedCheckpoint.data.repo_slug : undefined;
        const resumePage = parsedCheckpoint?.success ? parsedCheckpoint.data.page : 1;

        await nango.trackDeletesStart('Branch');

        const workspacesProxyConfig: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-workspaces/#api-user-workspaces-get
            endpoint: '/2.0/user/workspaces',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'pagelen',
                limit: 100,
                response_path: 'values'
            },
            retries: 3
        };

        const workspaces = [];
        for await (const page of nango.paginate(workspacesProxyConfig)) {
            for (const item of page) {
                const parsed = WorkspaceItemSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Invalid workspace item: ${parsed.error.message}`);
                }
                workspaces.push({ slug: parsed.data.workspace.slug });
            }
        }

        workspaces.sort((a, b) => a.slug.localeCompare(b.slug));

        const repositories: Array<{ workspace_slug: string; repo_slug: string }> = [];

        for (const workspace of workspaces) {
            const workspaceSlug = workspace.slug;

            const reposProxyConfig: ProxyConfiguration = {
                // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/#api-repositories-workspace-get
                endpoint: `/2.0/repositories/${encodeURIComponent(workspaceSlug)}`,
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: 1,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'pagelen',
                    limit: 100,
                    response_path: 'values'
                },
                retries: 3
            };

            for await (const repoPage of nango.paginate(reposProxyConfig)) {
                for (const repo of repoPage) {
                    const parsedRepo = RepositorySchema.safeParse(repo);
                    if (!parsedRepo.success) {
                        throw new Error(`Invalid repository item: ${parsedRepo.error.message}`);
                    }
                    repositories.push({ workspace_slug: workspaceSlug, repo_slug: parsedRepo.data.slug });
                }
            }
        }

        repositories.sort((a, b) => {
            const workspaceComparison = a.workspace_slug.localeCompare(b.workspace_slug);
            if (workspaceComparison !== 0) {
                return workspaceComparison;
            }

            return a.repo_slug.localeCompare(b.repo_slug);
        });

        let startIndex = repositories.length;
        if (repositories.length > 0) {
            startIndex = 0;
            if (resumeWorkspaceSlug && resumeRepoSlug) {
                startIndex = repositories.findIndex((repo) => {
                    return repo.workspace_slug > resumeWorkspaceSlug || (repo.workspace_slug === resumeWorkspaceSlug && repo.repo_slug >= resumeRepoSlug);
                });

                if (startIndex === -1) {
                    startIndex = repositories.length;
                }
            }
        }

        for (let repoIndex = startIndex; repoIndex < repositories.length; repoIndex++) {
            const repository = repositories[repoIndex]!;
            const workspaceSlug = repository.workspace_slug;
            const repoSlug = repository.repo_slug;
            let page = workspaceSlug === resumeWorkspaceSlug && repoSlug === resumeRepoSlug ? resumePage : 1;

            while (true) {
                // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-branches/#api-repositories-workspace-repo-slug-refs-branches-get
                const response = await nango.get({
                    endpoint: `/2.0/repositories/${encodeURIComponent(workspaceSlug)}/${encodeURIComponent(repoSlug)}/refs/branches`,
                    params: {
                        page,
                        pagelen: 100
                    },
                    retries: 3
                });

                const parsedResponse = BranchesResponseSchema.parse(response.data);
                const branches = [];
                for (const branch of parsedResponse.values) {
                    branches.push({
                        id: `${workspaceSlug}/${repoSlug}/${branch.name}`,
                        name: branch.name,
                        workspace: workspaceSlug,
                        repo_slug: repoSlug,
                        ...(branch.target && { target_hash: branch.target.hash })
                    });
                }

                if (branches.length > 0) {
                    await nango.batchSave(branches, 'Branch');
                }

                if (parsedResponse.next) {
                    page += 1;
                    await nango.saveCheckpoint({ workspace_slug: workspaceSlug, repo_slug: repoSlug, page });
                    continue;
                }

                const nextRepository = repositories[repoIndex + 1];
                if (nextRepository) {
                    await nango.saveCheckpoint({
                        workspace_slug: nextRepository.workspace_slug,
                        repo_slug: nextRepository.repo_slug,
                        page: 1
                    });
                }

                break;
            }
        }

        await nango.trackDeletesEnd('Branch');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
