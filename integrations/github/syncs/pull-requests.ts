import type { NangoSync, ProxyConfiguration, GithubMetadataInput, GithubPullRequest } from '../../models';
import { DEFAULT_SYNC_WINDOW, RETRIES } from '../constants';
import { getPullRequestsQuery } from '../graphql/pull-requests';
import { toPullRequest } from '../mappers/to-pull-request';
import { PullRequestQueryGraphQLResponse, PullRequestState } from '../types';

export default async function fetchData(nango: NangoSync) {
    const metadata = await nango.getMetadata<GithubMetadataInput>();
    // const LIMIT = 100;
    // Determine sync window in minutes (default to 2 years if not specified).
    const syncWindowMinutes = metadata.syncWindowMinutes || DEFAULT_SYNC_WINDOW;
    const syncWindow = new Date(Date.now() - syncWindowMinutes * 60 * 1000);

    let endCursor = '';
    let hasNextPage = true;

    const variables = {
        owner: metadata.owner,
        repo: metadata.repo,
        cursor: endCursor
    };
    let open = 0;
    let closed = 0;
    while (hasNextPage) {
        const mappedPullRequests: GithubPullRequest[] = [];
        variables.cursor = endCursor;

        const config: ProxyConfiguration = {
            // https://docs.github.com/en/graphql/overview/explorer
            // https://docs.github.com/en/graphql/guides/migrating-from-rest-to-graphql
            endpoint: `/graphql`,
            retries: RETRIES,
            data: { query: getPullRequestsQuery(), variables }
        };

        const response = await nango.post<PullRequestQueryGraphQLResponse>(config);
        const nodes = response.data?.data?.repository?.pullRequests?.nodes;
        let earlyExit = false;

        if (nodes) {
            for (const pr of nodes) {
                // since Github can't filter we need to cut the sync
                // if we have reached a record that is older than the last sync date
                const prLastUpdated = new Date(pr.updatedAt);
                if ((nango.lastSyncDate && prLastUpdated < nango.lastSyncDate) || prLastUpdated < syncWindow) {
                    if (prLastUpdated < syncWindow) {
                        await nango.log(`Syncing stopped because sync window reached`);
                    } else {
                        await nango.log(`Stopping sync early: PR ${pr.id} ${pr.updatedAt} is older than last sync date ${nango.lastSyncDate?.toString()}`, {
                            level: 'warn'
                        });
                    }
                    hasNextPage = false;
                    earlyExit = true;
                    break;
                }

                pr.state === PullRequestState.OPEN ? open++ : closed++;

                const githubPullRequest = toPullRequest(pr);
                mappedPullRequests.push(githubPullRequest);
                await nango.log(`Saved batch of pull requests: ${mappedPullRequests.length}`, { level: 'info' });
            }

            await nango.batchSave<GithubPullRequest>(mappedPullRequests, 'GithubPullRequest');
        }

        if (!earlyExit && response.data?.data?.repository?.pullRequests) {
            const pageInfo = response.data.data.repository.pullRequests.pageInfo;
            hasNextPage = pageInfo.hasNextPage;
            endCursor = pageInfo.endCursor || '';
        } else {
            hasNextPage = false;
        }
    }

    await nango.log(`Pull requests fetched: open ${open}, closed ${closed}`, {
        level: 'info'
    });
}
