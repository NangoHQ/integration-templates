import { GHOST_MEMBER, GithubConstants } from '../constants.js';
import type { PullRequestEventPayload, PullRequestGQl } from '../types.js';

export function getPullRequestType(pr: PullRequestGQl, isComment = false) {
    if (pr.reviewRequests?.nodes && pr.reviewRequests.nodes.length > 0) {
        return PullRequestType.REVIEW_REQUESTED;
    }

    if (pr.assignees && pr.assignees.length > 0) {
        return PullRequestType.ASSIGNED;
    }
    if (isComment) {
        return PullRequestType.COMMENT;
    }

    if (pr.state === 'OPEN') {
        return PullRequestType.OPEN;
    }

    if (pr.state === 'MERGED') {
        return PullRequestType.MERGED;
    }

    if (pr.state === 'CLOSED') {
        return PullRequestType.CLOSED;
    }

    return PullRequestType.MERGED;
}

export function getEventPullRequestType(pr: PullRequestEventPayload) {
    if (pr.pull_request.state === 'opened') {
        if (pr.pull_request.assignees.length > 0) {
            return GithubConstants.pull_request_assigned;
        }
        return GithubConstants.pull_request_opened;
    }
    if (pr.pull_request.state === 'closed') {
        return GithubConstants.pull_request_closed;
    }
    if (pr.pull_request.requested_reviewers.length > 0) {
        return GithubConstants.pull_request_review_requested;
    }
    if (pr.pull_request.state === 'merged') {
        return GithubConstants.pull_request_merged;
    }
    return GithubConstants.pull_request_merged;
}

export function getEventPullRequestSourceId(pr: PullRequestEventPayload) {
    const type = getEventPullRequestType(pr);
    if (type === PullRequestType.CLOSED) {
        return {
            sourceId: `gen-CE_${pr.pull_request.id}_${pr.pull_request.user.login}_${new Date(pr.pull_request.created_at).toISOString()}`
        };
    }

    if (type === PullRequestType.OPEN) {
        return {
            sourceId: pr.pull_request.id.toString()
        };
    }

    if (type === PullRequestType.MERGED) {
        return {
            sourceId: `gen-ME_${pr.pull_request.id}_${pr.pull_request.user.login}_${new Date(pr.pull_request.created_at).toISOString()}`
        };
    }

    if (type === PullRequestType.REVIEW_REQUESTED) {
        return {
            sourceId: `gen-RR_${pr.pull_request.id}_${pr.pull_request.user.login}_${new Date(pr.pull_request.created_at).toISOString()}`
        };
    }

    if (type === PullRequestType.ASSIGNED) {
        return {
            sourceId: `gen-AE_${pr.pull_request.id}_${pr.pull_request.user.login}_${pr.pull_request.user.login}_${new Date(pr.pull_request.created_at).toISOString()}`
        };
    }
    return {
        sourceId: `none`
    };
}

export const PullRequestType = {
    DRAFT: GithubConstants.draft,
    MERGED: GithubConstants.pull_request_merged,
    OPEN: GithubConstants.pull_request_opened,
    CLOSED: GithubConstants.pull_request_closed,
    ASSIGNED: GithubConstants.pull_request_assigned,
    REVIEW_REQUESTED: GithubConstants.pull_request_review_requested,
    REVIEWED: GithubConstants.pull_request_reviewed,
    COMMENT: GithubConstants.pull_request_comment,
    THREAD_COMMENT: GithubConstants.pull_request_review_thread_comment,
    UNKNOWN: GithubConstants.unknown
};

export function getPullRequestSourceId(pr: PullRequestGQl) {
    const type = getPullRequestType(pr);
    if (type === PullRequestType.CLOSED) {
        return {
            sourceId: `gen-CE_${pr.id}_${pr.author?.login ?? GHOST_MEMBER.displayName}_${new Date(pr.createdAt).toISOString()}`
        };
    }

    if (type === PullRequestType.OPEN) {
        return {
            sourceId: pr.id.toString()
        };
    }

    if (type === PullRequestType.MERGED) {
        return {
            sourceId: `gen-ME_${pr.id}_${pr.author?.login ?? GHOST_MEMBER.displayName}_${new Date(pr.createdAt).toISOString()}`
        };
    }

    if (type === PullRequestType.REVIEW_REQUESTED) {
        return {
            sourceId: `gen-RR_${pr.id}_${pr.author?.login ?? GHOST_MEMBER.displayName}_${new Date(pr.createdAt).toISOString()}`
        };
    }

    if (type === PullRequestType.ASSIGNED) {
        return {
            sourceId: `gen-AE_${pr.id}_${pr.author?.login ?? GHOST_MEMBER.displayName}_${
                pr.author?.login ?? GHOST_MEMBER.displayName
            }_${new Date(pr.createdAt).toISOString()}`
        };
    }

    return {
        sourceId: `none`
    };
}
