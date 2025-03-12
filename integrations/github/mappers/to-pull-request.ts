import type { GithubComment, GithubPullRequest, GithubUser } from '../../models';
import { PullRequestGraphQLResponse } from '../types';
import { toUser } from './to-user';

export function toPullRequest(pullRequest: PullRequestGraphQLResponse): GithubPullRequest {
    const assignees: GithubUser[] = pullRequest.assignees?.nodes.length > 0 ? pullRequest.assignees.nodes.map(toUser) : [];

    const reviewers: GithubUser[] = pullRequest.reviewRequests?.nodes.reduce((acc, reviewer) => {
        if (reviewer.requestedReviewer) {
            acc.push({ ...reviewer.requestedReviewer, id: reviewer.requestedReviewer.login });
        }
        return acc;
    }, [] as GithubUser[]);

    const labels: string[] = pullRequest.labels?.nodes.map((label) => label.name) || [];

    let latestReviewComment: { id: string; body: string } | undefined = pullRequest.reviews.nodes[0]?.comments.nodes[0];
    if (!latestReviewComment) {
        latestReviewComment = pullRequest.reviews.nodes[0];
    }

    if (!latestReviewComment) {
        latestReviewComment = pullRequest.comments.nodes[0];
    }

    return {
        id: pullRequest.id,
        url: pullRequest.url,
        state: pullRequest.state,
        title: pullRequest.title,
        user: { id: pullRequest.author.login, url: pullRequest.author.url },
        assignees,
        reviewers,
        draft: pullRequest.isDraft,
        labels,
        reviewDecision: pullRequest.reviewDecision as 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED',
        latestComment: latestReviewComment as GithubComment
    };
}
