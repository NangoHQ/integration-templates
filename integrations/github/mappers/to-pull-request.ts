import type { GithubPullRequest, NangoSync } from '../../models';
import { GithubConstants } from '../constants';
import { getEventPullRequestSourceId, getEventPullRequestType, getPullRequestSourceId, getPullRequestType } from '../helpers/get-pull-request-type';
import { getScore } from '../helpers/get-score';
import { getUserDetail } from '../helpers/get-user-detail';
import type { CommentNode, EventTypeResponse, PullRequestEventPayload, PullRequestGQl, UserFields } from '../types';
import { toMember } from './to-member';

export async function toPullRequest(
    nango: NangoSync,
    pullRequest: PullRequestGQl,
    integrationId: string,
    comment: CommentNode | null
): Promise<GithubPullRequest> {
    const PR_TYPE = getPullRequestType(pullRequest, Boolean(comment));
    const assignees =
        pullRequest.assignees?.nodes.length > 0
            ? await Promise.all(pullRequest.assignees.nodes.map((assignee: UserFields) => toMember(`${pullRequest.id} / ${pullRequest.url}`, nango, assignee)))
            : [];
    const reviewers =
        pullRequest.reviewRequests?.nodes.length > 0
            ? await Promise.all(
                  pullRequest.reviewRequests.nodes.map((reviewer) => toMember(`${pullRequest.id} / ${pullRequest.url}`, nango, reviewer.requestedReviewer))
              )
            : [];

    return {
        id: comment ? comment.node.id.toString() : pullRequest.id.toString(),
        integrationId,
        activityData: {
            timestamp: comment ? comment.node.createdAt : (pullRequest.createdAt ?? GithubConstants.default_timestamp),
            sourceId: comment ? comment.node.id.toString() : (getPullRequestSourceId(pullRequest)?.sourceId ?? ''),
            platform: GithubConstants.github,
            channel: pullRequest.url,
            title: pullRequest.title ?? '',
            body: comment ? comment.node.body : (pullRequest.body ?? ''),
            url: pullRequest.url,
            isContribution: false,
            type: getPullRequestType(pullRequest, Boolean(comment)),
            score: getScore(getPullRequestType(pullRequest)),
            attributes: {
                state: pullRequest.state,
                additions: pullRequest.additions,
                deletions: pullRequest.deletions,
                changedFiles: pullRequest.changedFiles,
                authorAssociation: pullRequest.authorAssociation,
                labels: pullRequest.labels.nodes.map((label) => label.name)
            },
            member: await toMember(`${pullRequest.id} / ${pullRequest.url}`, nango, comment ? comment.node.author : pullRequest.author),
            objectMembers:
                PR_TYPE === GithubConstants.pull_request_review_requested
                    ? reviewers
                    : PR_TYPE === GithubConstants.pull_request_assigned
                      ? assignees
                      : undefined
        }
    };
}

export async function fromEventToPullRequest(
    nango: NangoSync,
    event: EventTypeResponse,
    integrationId: string,
    refreshToken: () => Promise<string>
): Promise<GithubPullRequest> {
    const payload: PullRequestEventPayload = event.payload;
    const userDetails = await getUserDetail(payload.pull_request.user.url, nango, refreshToken);
    return {
        id: payload.pull_request.id.toString(),
        timestamp: new Date().toISOString(),
        integrationId,
        activityData: {
            timestamp: event.created_at,
            sourceId: getEventPullRequestSourceId(payload).sourceId,
            platform: GithubConstants.github,
            channel: payload.pull_request.url,
            body: payload.pull_request.body,
            url: payload.pull_request.url,
            isContribution: false,
            type: getEventPullRequestType(payload),
            score: getScore(getEventPullRequestType(payload)),
            attributes: {
                state: payload.pull_request.state,
                additions: payload.pull_request.additions,
                deletions: payload.pull_request.deletions,
                changedFiles: payload.pull_request.changed_files,
                authorAssociation: payload.pull_request.author_association,
                labels: payload.pull_request.labels.map((label) => label.name)
            },
            member: {
                displayName: payload.pull_request.user.login,
                identities: [
                    {
                        platform: GithubConstants.github,
                        type: GithubConstants.username,
                        verified: true,
                        value: payload.pull_request.user.login,
                        sourceId: payload.pull_request.user.id.toString()
                    }
                ],
                attributes: {
                    avatarUrl: userDetails.avatar_url,
                    bio: userDetails.bio ?? '',
                    company: userDetails.company ?? '',
                    isBot: userDetails.type === GithubConstants.bot,
                    isHireable: userDetails.hireable ?? false,
                    location: userDetails.location ?? '',
                    url: userDetails.html_url
                }
            }
        }
    };
}
