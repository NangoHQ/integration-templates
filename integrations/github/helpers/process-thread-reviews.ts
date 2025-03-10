import type { GithubConnectionMetadata, GithubPullRequestComment, NangoSync, ProxyConfiguration } from '../../models';
import { RETRIES, RETRY_ON } from '../constants.js';
import { getPullRequestReviewThreads, getReviewThreadComments } from '../graphql/pull-requests.js';
import { toPullRequest } from '../mappers/to-pull-request.js';
import type { GetThreadCommentsResponseGQL, ReviewThreadNode } from '../types';
import { shouldAbortSync } from './exceed-time-limit-check.js';

// Helper function to process review threads if available
export async function processReviewThreadComments(
    nango: NangoSync,
    pr: any,
    integrationId: string,
    mostRecentEventTime: Date,
    startTime: Date,
    metadata: GithubConnectionMetadata,
    syncName: string,
    refreshToken: () => Promise<string>,
    LIMIT: number
): Promise<{ comments: GithubPullRequestComment[]; count: number }> {
    const pullRequestReviewThreadComments: GithubPullRequestComment[] = [];
    let reviewThreadCommentCount = 0;
    const [owner, repo] = metadata.repo.split('/');

    if (pr.reviewThreads && pr.reviewThreads.edges) {
        let reviewThreadCursor = pr.reviewThreads.pageInfo?.endCursor;
        let hasMoreReviewThreads = pr.reviewThreads.pageInfo?.hasNextPage || false;

        // Process the initial set of review threads
        await processReviewThreadSet(
            pr.reviewThreads.edges,
            pr,
            nango,
            integrationId,
            pullRequestReviewThreadComments,
            reviewThreadCommentCount,
            mostRecentEventTime,
            startTime,
            metadata,
            syncName,
            refreshToken,
            LIMIT,
            owner,
            repo
        );

        // Fetch and process additional review threads if any
        let previousThreadCursor = '';
        while (hasMoreReviewThreads) {
            if (await shouldAbortSync(startTime, nango, metadata, syncName, mostRecentEventTime)) {
                break;
            }

            if (reviewThreadCursor === previousThreadCursor) {
                await nango.log('Breaking loop: Review thread cursor did not change', {
                    level: 'warn'
                });
                break;
            }
            previousThreadCursor = reviewThreadCursor;

            const reviewThreadsVariables = {
                owner,
                repo,
                prNumber: Number(pr.url.split('/').pop()),
                cursor: reviewThreadCursor
            };

            await nango.log(`Fetching additional review threads for PR ${pr.url} at cursor ${reviewThreadCursor}`);

            const reviewThreadsConfig: ProxyConfiguration = {
                // https://docs.github.com/en/graphql/overview/explorer
                endpoint: `/graphql`,
                retries: RETRIES,
                retryOn: RETRY_ON,
                data: {
                    query: getPullRequestReviewThreads(LIMIT),
                    variables: reviewThreadsVariables
                },
                headers: {
                    authorization: `Bearer ${await refreshToken()}`
                }
            };

            const reviewThreadsResponse = await nango.post(reviewThreadsConfig);
            const reviewThreadsData = reviewThreadsResponse?.data?.data?.repository?.pullRequest?.reviewThreads;
            if (reviewThreadsData && reviewThreadsData.edges) {
                const result = await processReviewThreadSet(
                    reviewThreadsData.edges,
                    pr,
                    nango,
                    integrationId,
                    pullRequestReviewThreadComments,
                    reviewThreadCommentCount,
                    mostRecentEventTime,
                    startTime,
                    metadata,
                    syncName,
                    refreshToken,
                    LIMIT,
                    owner,
                    repo
                );

                reviewThreadCommentCount = result.count;
            }

            reviewThreadCursor = reviewThreadsData?.pageInfo?.endCursor || '';
            hasMoreReviewThreads = reviewThreadsData?.pageInfo?.hasNextPage || false;
        }
    }

    return {
        comments: pullRequestReviewThreadComments,
        count: reviewThreadCommentCount
    };
}

/**
 * Helper function to process a set of review threads
 * Extracts and processes comments within each thread
 */
async function processReviewThreadSet(
    threadEdges: { node: ReviewThreadNode }[],
    pr: any,
    nango: NangoSync,
    integrationId: string,
    pullRequestReviewThreadComments: GithubPullRequestComment[],
    reviewThreadCommentCount: number,
    mostRecentEventTime: Date,
    startTime: Date,
    metadata: GithubConnectionMetadata,
    syncName: string,
    refreshToken: () => Promise<string>,
    LIMIT: number,
    owner: string | undefined,
    repo: string | undefined
): Promise<{ count: number }> {
    for (const threadEdge of threadEdges) {
        if (!threadEdge || !threadEdge.node) continue;

        const thread = threadEdge.node;

        if (thread.comments && thread.comments.edges) {
            for (const commentEdge of thread.comments.edges) {
                if (!commentEdge || !commentEdge.node || !commentEdge.node.id) continue;

                reviewThreadCommentCount++;

                const reviewThreadComment = await toPullRequest(nango, pr, integrationId, commentEdge);

                pullRequestReviewThreadComments.push(reviewThreadComment);

                const commentDate = new Date(commentEdge.node.createdAt);
                if (commentDate > mostRecentEventTime) {
                    mostRecentEventTime = commentDate;
                }
            }

            if (thread.comments.pageInfo?.hasNextPage) {
                let commentCursor = thread.comments.pageInfo.endCursor;
                let hasMoreComments: boolean = thread.comments.pageInfo.hasNextPage;
                let previousCommentCursor = '';

                while (hasMoreComments) {
                    if (await shouldAbortSync(startTime, nango, metadata, syncName, mostRecentEventTime)) {
                        break;
                    }

                    if (commentCursor === previousCommentCursor) {
                        await nango.log('Breaking loop: Thread comment cursor did not change', { level: 'warn' });
                        break;
                    }
                    previousCommentCursor = commentCursor || '';

                    const commentVariables = {
                        owner,
                        repo,
                        prNumber: pr.number,
                        threadId: thread.id,
                        cursor: commentCursor
                    };

                    await nango.log(`Fetching additional comments for review thread ${thread.id} at cursor ${commentCursor}`);

                    const commentConfig: ProxyConfiguration = {
                        // https://docs.github.com/en/graphql/overview/explorer
                        endpoint: `/graphql`,
                        retries: RETRIES,
                        retryOn: RETRY_ON,
                        data: {
                            query: getReviewThreadComments(LIMIT),
                            variables: commentVariables
                        },
                        headers: {
                            authorization: `Bearer ${await refreshToken()}`
                        }
                    };

                    const commentResponse = await nango.post<GetThreadCommentsResponseGQL>(commentConfig);
                    const commentData = commentResponse?.data?.data?.repository?.pullRequest?.reviewThread?.comments;

                    if (commentData && commentData.edges) {
                        for (const commentEdge of commentData.edges) {
                            if (!commentEdge || !commentEdge.node || !commentEdge.node.id) continue;

                            reviewThreadCommentCount++;

                            const reviewThreadComment = await toPullRequest(nango, pr, integrationId, commentEdge);
                            pullRequestReviewThreadComments.push(reviewThreadComment);

                            const commentDate = new Date(commentEdge.node.createdAt);
                            if (commentDate > mostRecentEventTime) {
                                mostRecentEventTime = commentDate;
                            }
                        }
                    }

                    commentCursor = commentData?.pageInfo?.endCursor || '';
                    hasMoreComments = commentData?.pageInfo?.hasNextPage || false;
                }
            }
        }
    }

    return { count: reviewThreadCommentCount };
}
