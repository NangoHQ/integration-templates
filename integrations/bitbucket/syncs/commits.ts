import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CommitSchema = z.object({
    id: z.string(),
    hash: z.string(),
    date: z.string(),
    message: z.string().optional(),
    author_raw: z.string().optional(),
    author_user_uuid: z.string().optional(),
    author_user_display_name: z.string().optional(),
    author_user_account_id: z.string().optional(),
    parent_hashes: z.array(z.string()).optional(),
    repository_uuid: z.string().optional(),
    repository_full_name: z.string().optional()
});

const LastHashesSchema = z.record(z.string(), z.string());

const CheckpointSchema = z.object({
    last_hashes_json: z.string()
});

function parseLastHashes(value: string): Record<string, string> {
    try {
        return LastHashesSchema.parse(JSON.parse(value));
    } catch {
        return {};
    }
}

const sync = createSync({
    description: 'Sync commits per repository',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'GET', path: '/syncs/commits' }],
    models: {
        Commit: CommitSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = checkpoint ? CheckpointSchema.safeParse(checkpoint) : null;
        const lastHashes = parsedCheckpoint?.success ? parseLastHashes(parsedCheckpoint.data.last_hashes_json) : {};
        const nextLastHashes = { ...lastHashes };

        const workspacesProxyConfig: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-workspaces/#api-user-workspaces-get
            endpoint: '/2.0/user/workspaces',
            paginate: {
                type: 'link',
                link_path_in_response_body: 'next',
                response_path: 'values',
                limit: 30,
                limit_name_in_request: 'pagelen'
            },
            retries: 3
        };

        for await (const workspacesPage of nango.paginate<unknown>(workspacesProxyConfig)) {
            const workspaces = z
                .array(
                    z.object({
                        workspace: z.object({
                            slug: z.string()
                        })
                    })
                )
                .parse(workspacesPage);

            for (const workspace of workspaces) {
                const workspaceSlug = workspace.workspace.slug;

                const reposProxyConfig: ProxyConfiguration = {
                    // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/#api-repositories-workspace-get
                    endpoint: `/2.0/repositories/${encodeURIComponent(workspaceSlug)}`,
                    paginate: {
                        type: 'link',
                        link_path_in_response_body: 'next',
                        response_path: 'values',
                        limit: 30,
                        limit_name_in_request: 'pagelen'
                    },
                    retries: 3
                };

                for await (const reposPage of nango.paginate<unknown>(reposProxyConfig)) {
                    const repos = z
                        .array(
                            z.object({
                                slug: z.string(),
                                uuid: z.string(),
                                full_name: z.string().optional()
                            })
                        )
                        .parse(reposPage);

                    for (const repo of repos) {
                        const repoSlug = repo.slug;
                        const repoUuid = repo.uuid;
                        const repoFullName = repo.full_name;
                        const repoKey = `${workspaceSlug}/${repoSlug}`;
                        const lastHash = lastHashes[repoKey] ?? '';

                        const commitsProxyConfig: ProxyConfiguration = {
                            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-commits/#api-repositories-workspace-repo-slug-commits-get
                            endpoint: `/2.0/repositories/${encodeURIComponent(workspaceSlug)}/${encodeURIComponent(repoSlug)}/commits`,
                            paginate: {
                                type: 'link',
                                link_path_in_response_body: 'next',
                                response_path: 'values',
                                limit: 30,
                                limit_name_in_request: 'pagelen'
                            },
                            retries: 3
                        };

                        let shouldStop = false;
                        let newestHashForRepo = '';

                        for await (const commitsPage of nango.paginate<unknown>(commitsProxyConfig)) {
                            const commits = z
                                .array(
                                    z.object({
                                        hash: z.string(),
                                        date: z.string(),
                                        message: z.string().optional(),
                                        author: z
                                            .object({
                                                raw: z.string().optional(),
                                                user: z
                                                    .object({
                                                        uuid: z.string().optional(),
                                                        display_name: z.string().optional(),
                                                        account_id: z.string().optional()
                                                    })
                                                    .optional()
                                            })
                                            .optional(),
                                        parents: z
                                            .array(
                                                z.object({
                                                    hash: z.string()
                                                })
                                            )
                                            .optional()
                                    })
                                )
                                .parse(commitsPage);

                            const mappedCommits: z.infer<typeof CommitSchema>[] = [];
                            for (const commit of commits) {
                                if (lastHash !== '' && commit.hash === lastHash) {
                                    shouldStop = true;
                                    break;
                                }

                                if (newestHashForRepo === '') {
                                    newestHashForRepo = commit.hash;
                                }

                                mappedCommits.push({
                                    id: commit.hash,
                                    hash: commit.hash,
                                    date: commit.date,
                                    message: commit.message,
                                    author_raw: commit.author?.raw,
                                    author_user_uuid: commit.author?.user?.uuid,
                                    author_user_display_name: commit.author?.user?.display_name,
                                    author_user_account_id: commit.author?.user?.account_id,
                                    parent_hashes: commit.parents?.map((p) => p.hash),
                                    repository_uuid: repoUuid,
                                    repository_full_name: repoFullName
                                });
                            }

                            if (mappedCommits.length > 0) {
                                await nango.batchSave(mappedCommits, 'Commit');
                            }

                            if (shouldStop) {
                                break;
                            }
                        }

                        if (newestHashForRepo !== '') {
                            nextLastHashes[repoKey] = newestHashForRepo;
                            await nango.saveCheckpoint({
                                last_hashes_json: JSON.stringify(nextLastHashes)
                            });
                        }
                    }
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
