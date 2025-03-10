import { GetCommitsQLResponse } from '../types';
import type { GithubCommit, GithubConnectionMetadata, NangoSync, ProxyConfiguration } from '../../models';
import { RETRIES, RETRY_ON } from '../constants';
import { commitsQuery, prsByOidsQuery } from '../graphql/commits';
import { shouldAbortSync } from '../helpers/exceed-time-limit-check';
import { getAccessToken } from '../helpers/get-access-token';
import { getNewToken } from '../helpers/get-new-token';
import { toCommit } from '../mappers/to-commit';

export default async function fetchData(nango: NangoSync) {
    const accessToken = await getAccessToken(nango);
    let currToken = accessToken;
    const metadata = await nango.getMetadata<GithubConnectionMetadata>();
    const connections = metadata.connection_ids;
    const startTime = new Date();
    const integrationId = nango.connectionId;
    const syncName = 'commits';

    const refreshToken = async () => {
        currToken = await getNewToken(nango, accessToken, connections, currToken);
        return currToken;
    };

    let commitCount = 0;

    if (!metadata?.repo) {
        await nango.log('No repo configured', { level: 'error' });
        return;
    }

    const [owner, repo] = metadata.repo.split('/');

    if (!owner || !repo) {
        await nango.log("Invalid repo format. Expected 'owner/repo'", {
            level: 'error'
        });
        return;
    }

    const LIMIT = 100;

    const variables: Record<string, any> = {
        owner,
        repo,
        pageSize: LIMIT
    };

    if (metadata?.lastSyncCheckPoint?.[syncName]) {
        variables['since'] = new Date(metadata.lastSyncCheckPoint?.[syncName]).toISOString();
    } else if (nango.lastSyncDate) {
        variables['since'] = nango.lastSyncDate.toISOString();
    }

    await nango.log(`Fetching commits for ${metadata.repo} using GraphQL`, {
        level: 'info'
    });

    let hasNextPage = true;
    let cursor: string | null = null;

    let leastObjectTime = new Date(0);
    while (hasNextPage) {
        if (await shouldAbortSync(startTime, nango, metadata, syncName, leastObjectTime)) return;

        if (cursor) {
            variables['cursor'] = cursor;
        } else {
            delete variables['cursor'];
        }

        await nango.log(`Variables: ${JSON.stringify(variables, null, 2)}`, {
            level: 'debug'
        });

        const config: ProxyConfiguration = {
            // https://docs.github.com/en/graphql/overview/explorer
            endpoint: `/graphql`,
            retries: RETRIES,
            retryOn: RETRY_ON,
            data: { query: commitsQuery, variables },
            headers: {
                authorization: `Bearer ${await refreshToken()}`
            }
        };

        const response = await nango.post<GetCommitsQLResponse>(config);
        if (response.data.errors && response.data.errors.length > 0) {
            await nango.log(`GraphQL Errors: ${JSON.stringify(response.data.errors, null, 2)}`, {
                level: 'error'
            });
        }
        const repository = response.data.data?.repository;

        if (!repository) {
            await nango.log(`Repository is undefined. Full response: ${JSON.stringify(response.data, null, 2)}`, {
                level: 'error'
            });
            continue;
        }

        const { url: repoURL } = repository;

        const defaultBranchRef = repository?.defaultBranchRef;
        if (!defaultBranchRef?.target) {
            await nango.log('Default branch or commit not found', {
                level: 'error'
            });
        }

        const history = defaultBranchRef?.target.history;
        const commits = history?.nodes;
        const pageInfo = history?.pageInfo;

        hasNextPage = pageInfo?.hasNextPage;
        cursor = pageInfo?.endCursor;

        const mappedCommits: GithubCommit[] = [];
        if (repository.defaultBranchRef?.target?.history?.nodes) {
            const ids = new Set<string>();
            for (const node of commits) {
                if (!ids.has(node.id)) {
                    ids.add(node.id);
                }
                commitCount++;
                const mappedCommit = await toCommit(nango, node, integrationId, repoURL);
                leastObjectTime = new Date(node.authoredDate);
                mappedCommits.push(mappedCommit);
            }

            const BATCH_SIZE = 25;
            const idArray = Array.from(ids);

            // Process PR lookups in batches of 25
            for (let i = 0; i < idArray.length; i += BATCH_SIZE) {
                const batchIds = idArray.slice(i, i + BATCH_SIZE);

                const prConfig: ProxyConfiguration = {
                    // https://docs.github.com/en/graphql/overview/explorer
                    endpoint: `/graphql`,
                    retries: RETRIES,
                    retryOn: RETRY_ON,
                    data: { query: prsByOidsQuery, variables: { ids: batchIds } },
                    headers: {
                        authorization: `Bearer ${await refreshToken()}`
                    }
                };

                await nango.log(`Fetching PRs for batch ${i / BATCH_SIZE + 1} with ${batchIds.length} commits`, {
                    level: 'debug'
                });

                await nango.log(`Batch commit ids: ${JSON.stringify(batchIds)}`, {
                    level: 'debug'
                });

                await new Promise((resolve) => setTimeout(resolve, 1000));

                const prResponse = await nango.post(prConfig);
                const prNodes = prResponse.data.data?.nodes;

                if (prNodes) {
                    await nango.log(`Fetched ${prNodes.length} PRs for batch ${i / BATCH_SIZE + 1}`, {
                        level: 'debug'
                    });
                    for (const prNode of prNodes) {
                        const { oid, associatedPullRequests } = prNode;
                        const commit = mappedCommits.find((commit) => commit.id === `commit-${oid}`);
                        if (commit) {
                            const [associatedPullRequest] = associatedPullRequests.nodes;
                            commit.activityData.sourceParentId = associatedPullRequest?.id || '';
                        }
                    }
                }
            }
        }

        if (mappedCommits.length > 0) {
            await nango.batchSave(mappedCommits, 'GithubCommit');
            await nango.log(`Processed ${mappedCommits.length} commits. Total: ${commitCount} on ${new Date().toISOString()}`, { level: 'info' });
        }
    }

    await nango.log(`Total commits fetched: ${commitCount}`, { level: 'info' });
    await nango.updateMetadata({
        ...metadata,
        lastSyncCheckPoint: {
            ...(typeof metadata.lastSyncCheckPoint === 'object' && metadata.lastSyncCheckPoint !== null ? metadata.lastSyncCheckPoint : {}),
            [syncName]: null
        }
    });
}
