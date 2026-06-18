import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TagSchema = z.object({
    id: z.string(),
    name: z.string(),
    workspace: z.string(),
    repo_slug: z.string(),
    target_hash: z.string(),
    target_date: z.string().optional(),
    message: z.string().optional(),
    date: z.string().optional()
});

const WorkspaceAccessSchema = z.object({
    workspace: z.object({
        slug: z.string()
    })
});

const RepositorySchema = z.object({
    slug: z.string()
});

const TagItemSchema = z.object({
    name: z.string(),
    target: z
        .object({
            hash: z.string().optional(),
            date: z.string().optional()
        })
        .optional(),
    message: z.string().optional(),
    date: z.string().optional()
});

const TagsResponseSchema = z.object({
    values: z.array(TagItemSchema),
    next: z.string().optional()
});

const CheckpointSchema = z.object({
    workspace_slug: z.string(),
    repo_slug: z.string(),
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync tags per repository.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Tag: TagSchema
    },
    endpoints: [
        {
            path: '/syncs/tags',
            method: 'GET'
        }
    ],
    checkpoint: CheckpointSchema,

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = checkpoint ? CheckpointSchema.safeParse(checkpoint) : null;
        const resumeWorkspaceSlug = parsedCheckpoint?.success ? parsedCheckpoint.data.workspace_slug : undefined;
        const resumeRepoSlug = parsedCheckpoint?.success ? parsedCheckpoint.data.repo_slug : undefined;
        const resumePage = parsedCheckpoint?.success ? parsedCheckpoint.data.page : 1;

        await nango.trackDeletesStart('Tag');

        const workspacesProxyConfig: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-workspaces/#api-user-workspaces-get
            endpoint: '/2.0/user/workspaces',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'pagelen',
                limit: 50,
                response_path: 'values'
            },
            retries: 3
        };

        const workspaces: Array<{ slug: string }> = [];
        for await (const page of nango.paginate(workspacesProxyConfig)) {
            const items = z.array(WorkspaceAccessSchema).safeParse(page);
            if (!items.success) {
                throw new Error('Failed to parse workspaces response');
            }
            for (const access of items.data) {
                workspaces.push({ slug: access.workspace.slug });
            }
        }

        workspaces.sort((a, b) => a.slug.localeCompare(b.slug));

        const repos: Array<{ workspace: string; slug: string }> = [];
        for (const workspace of workspaces) {
            const reposProxyConfig: ProxyConfiguration = {
                // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/#api-repositories-workspace-get
                endpoint: `/2.0/repositories/${encodeURIComponent(workspace.slug)}`,
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: 1,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'pagelen',
                    limit: 50,
                    response_path: 'values'
                },
                retries: 3
            };

            for await (const page of nango.paginate(reposProxyConfig)) {
                const items = z.array(RepositorySchema).safeParse(page);
                if (!items.success) {
                    throw new Error('Failed to parse repositories response');
                }
                for (const repo of items.data) {
                    repos.push({ workspace: workspace.slug, slug: repo.slug });
                }
            }
        }

        repos.sort((a, b) => {
            const workspaceComparison = a.workspace.localeCompare(b.workspace);
            if (workspaceComparison !== 0) {
                return workspaceComparison;
            }

            return a.slug.localeCompare(b.slug);
        });

        let startIndex = repos.length;
        if (repos.length > 0) {
            startIndex = 0;
            if (resumeWorkspaceSlug && resumeRepoSlug) {
                startIndex = repos.findIndex((repo) => {
                    return repo.workspace > resumeWorkspaceSlug || (repo.workspace === resumeWorkspaceSlug && repo.slug >= resumeRepoSlug);
                });

                if (startIndex === -1) {
                    startIndex = repos.length;
                }
            }
        }

        for (let repoIndex = startIndex; repoIndex < repos.length; repoIndex++) {
            const repo = repos[repoIndex]!;
            let page = repo.workspace === resumeWorkspaceSlug && repo.slug === resumeRepoSlug ? resumePage : 1;

            while (true) {
                // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-refs/#api-repositories-workspace-repo-slug-refs-tags-get
                const response = await nango.get({
                    endpoint: `/2.0/repositories/${encodeURIComponent(repo.workspace)}/${encodeURIComponent(repo.slug)}/refs/tags`,
                    params: {
                        page,
                        pagelen: 50,
                        sort: '-target.date'
                    },
                    retries: 3
                });

                const parsedResponse = TagsResponseSchema.parse(response.data);

                const mappedTags: Array<z.infer<typeof TagSchema>> = [];
                for (const data of parsedResponse.values) {
                    const targetHash = data.target?.hash;
                    if (!targetHash) {
                        throw new Error('Tag missing required target hash');
                    }

                    mappedTags.push({
                        id: `${repo.workspace}/${repo.slug}/${data.name}`,
                        name: data.name,
                        workspace: repo.workspace,
                        repo_slug: repo.slug,
                        target_hash: targetHash,
                        ...(data.target?.date && { target_date: data.target.date }),
                        ...(data.message && { message: data.message }),
                        ...(data.date && { date: data.date })
                    });
                }

                if (mappedTags.length > 0) {
                    await nango.batchSave(mappedTags, 'Tag');
                }

                if (parsedResponse.next) {
                    page += 1;
                    await nango.saveCheckpoint({ workspace_slug: repo.workspace, repo_slug: repo.slug, page });
                    continue;
                }

                const nextRepo = repos[repoIndex + 1];
                if (nextRepo) {
                    await nango.saveCheckpoint({
                        workspace_slug: nextRepo.workspace,
                        repo_slug: nextRepo.slug,
                        page: 1
                    });
                }

                break;
            }
        }

        await nango.trackDeletesEnd('Tag');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
