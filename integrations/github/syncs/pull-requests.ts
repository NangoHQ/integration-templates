import type {
    GithubConnectionMetadata,
    GithubPullRequest,
    GithubPullRequestComment,
    NangoSync,
    ProxyConfiguration,
    GithubPullRequestReviewThreadComment
} from '../../models';
import { RETRIES, RETRY_ON } from '../constants';
import { getPullRequestComments, getPullRequestsQuery } from '../graphql/pull-requests.js';
import { shouldAbortSync } from '../helpers/exceed-time-limit-check';
import { getAccessToken } from '../helpers/get-access-token';
import { getNewToken } from '../helpers/get-new-token';
import { processReviewThreadComments } from '../helpers/process-thread-reviews';
import { toPullRequest } from '../mappers/to-pull-request.js';
import { GetCommentsResponseGQL, PullRequestGraphQLResponse } from '../types';

export default async function fetchData(nango: NangoSync) {
    const accessToken = await getAccessToken(nango);
    let currToken = accessToken;

    const metadata = await nango.getMetadata<GithubConnectionMetadata>();
    const integrationId = nango.connectionId;
    let open = 0;
    let closed = 0;
    const LIMIT = 100;
    const [owner, repo] = metadata.repo.split('/');
    let commentCount = 0;
    const syncName = 'pull-requests';

    let lastSyncDate: string = '';
    if (metadata?.lastSyncCheckPoint?.[syncName]) {
        lastSyncDate = new Date(metadata?.lastSyncCheckPoint?.[syncName]).toISOString();
    } else if (nango.lastSyncDate) {
        lastSyncDate = nango.lastSyncDate.toISOString();
    }

    const startTime = new Date();
    const connections = metadata.connection_ids;

    const refreshToken = async () => {
        currToken = await getNewToken(nango, accessToken, connections, currToken);
        return currToken;
    };

    let endCursor = '';
    let hasNextPage = true;

    let mostRecentEventTime = new Date(0);
    while (hasNextPage) {
        if (await shouldAbortSync(startTime, nango, metadata, syncName, mostRecentEventTime)) return;

        const mappedPullRequests: GithubPullRequest[] = [];
        const pullRequestComments: GithubPullRequestComment[] = [];
        const pullRequestReviewThreadComments: GithubPullRequestComment[] = [];

        const variables = {
            owner,
            repo,
            cursor: endCursor
        };

        const config: ProxyConfiguration = {
            // https://docs.github.com/en/graphql/overview/explorer
            // https://docs.github.com/en/graphql/guides/migrating-from-rest-to-graphql
            endpoint: `/graphql`,
            retries: RETRIES,
            retryOn: RETRY_ON,
            data: { query: getPullRequestsQuery(LIMIT), variables },
            headers: {
                authorization: `Bearer ${await refreshToken()}`
            }
        };

        const response = await nango.post<PullRequestGraphQLResponse>(config);
        const { data } = response;
        const nodes = data?.data?.repository?.pullRequests?.nodes;
        let earlyExit = false;

        if (nodes) {
            for (const pr of nodes) {
                // since Github can't filter we need to cut the sync
                // if we have reached a record that is older than the last sync date
                if (new Date(pr.updatedAt) < new Date(lastSyncDate)) {
                    await nango.log(`Breaking loop: PR ${pr.id} ${pr.updatedAt} is older than last sync date ${lastSyncDate}`, { level: 'warn' });
                    hasNextPage = false;
                    earlyExit = true;
                    break;
                }
                if (pr.state === 'OPEN') {
                    open++;
                }
                if (pr.state === 'CLOSED' || pr.state === 'MERGED') {
                    closed++;
                }

                const githubPullRequest = await toPullRequest(nango, pr, integrationId, null);
                mappedPullRequests.push(githubPullRequest);
                mostRecentEventTime = new Date(pr.updatedAt);

                let commentCursor = pr.comments.pageInfo.endCursor;
                let hasMoreComments = pr.comments.pageInfo.hasNextPage;

                for (const comment of pr.comments.edges) {
                    if (comment?.node.id) {
                        commentCount++;
                        const githubComment = await toPullRequest(nango, pr, integrationId, comment);
                        pullRequestComments.push(githubComment);
                    }
                }

                let previousCommentCursor = '';
                while (hasMoreComments) {
                    if (await shouldAbortSync(startTime, nango, metadata, syncName, mostRecentEventTime)) return;

                    if (commentCursor === previousCommentCursor) {
                        await nango.log('Breaking loop: Comment cursor did not change', {
                            level: 'warn'
                        });
                        break;
                    }
                    previousCommentCursor = commentCursor || '';

                    const commentVariables = {
                        owner,
                        repo,
                        prId: pr.id,
                        cursor: commentCursor
                    };

                    await nango.log(`Fetching comments for issue ${pr.id} at cursor ${commentCursor}, current comment count ${commentCount}`);

                    const commentConfig: ProxyConfiguration = {
                        // https://docs.github.com/en/graphql/reference/objects#pullrequest
                        endpoint: `/graphql`,
                        retries: RETRIES,
                        retryOn: RETRY_ON,
                        data: {
                            query: getPullRequestComments(LIMIT),
                            variables: commentVariables
                        },
                        headers: {
                            authorization: `Bearer ${await refreshToken()}`
                        }
                    };

                    const commentResponse = await nango.post<GetCommentsResponseGQL>(commentConfig);
                    const commentData = commentResponse.data?.data?.repository?.pullRequest?.comments;

                    for (const comment of commentData?.edges || []) {
                        const githubComment = await toPullRequest(nango, pr, integrationId, comment);
                        pullRequestComments.push(githubComment);
                        commentCount++;
                    }
                    commentCursor = commentData?.pageInfo.endCursor || '';
                    hasMoreComments = commentData?.pageInfo.hasNextPage || false;
                }
                if (pr.reviewThreads) {
                    const reviewThreadResult = await processReviewThreadComments(
                        nango,
                        pr,
                        integrationId,
                        mostRecentEventTime,
                        startTime,
                        metadata,
                        syncName,
                        refreshToken,
                        LIMIT
                    );

                    pullRequestReviewThreadComments.push(...reviewThreadResult.comments);
                    await nango.log(`Review thread comments fetched: ${reviewThreadResult.count}`, { level: 'info' });
                }
            }

            await nango.batchSave<GithubPullRequestReviewThreadComment>(pullRequestReviewThreadComments, 'GithubPullRequestReviewThreadComment');
            await nango.batchSave<GithubPullRequestComment>(pullRequestComments, 'GithubPullRequestComment');
            await nango.batchSave<GithubPullRequest>(mappedPullRequests, 'GithubPullRequest');
        }

        if (!earlyExit && data?.data?.repository?.pullRequests) {
            const pageInfo = data.data.repository.pullRequests.pageInfo;
            hasNextPage = pageInfo.hasNextPage;
            endCursor = pageInfo.endCursor || '';
        } else {
            hasNextPage = false;
        }

        await nango.log(`pull request count: ${open + closed} on date ${mostRecentEventTime.toISOString()}`, { level: 'info' });
    }

    await nango.log(`Pull requests fetched: open ${open}, closed ${closed} and comments: ${commentCount}`, {
        level: 'info'
    });
    await nango.updateMetadata({
        ...metadata,
        lastSyncCheckPoint: {
            ...(typeof metadata.lastSyncCheckPoint === 'object' && metadata.lastSyncCheckPoint !== null ? metadata.lastSyncCheckPoint : {}),
            [syncName]: null
        }
    });
}
