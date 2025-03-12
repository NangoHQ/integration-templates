import type { GithubComment, GithubPullRequest, GithubUser } from '../../models.js';
import type { PullRequestGraphQLResponse, PullRequestReviewDecision } from '../types.js';
import { toUser } from './to-user.js';

export function toPullRequest(pullRequest: PullRequestGraphQLResponse): GithubPullRequest {
    const assignees: GithubUser[] = pullRequest.assignees?.nodes.length > 0 ? pullRequest.assignees.nodes.map(toUser) : [];

    const reviewers: GithubUser[] = pullRequest.reviewRequests?.nodes.reduce((acc: GithubUser[], reviewer) => {
        if (reviewer.requestedReviewer) {
            acc.push({ ...reviewer.requestedReviewer, id: reviewer.requestedReviewer.login });
        }
        return acc;
    }, []);

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
        reviewDecision: pullRequest.reviewDecision as PullRequestReviewDecision,
        latestComment: latestReviewComment as GithubComment
    };
}
