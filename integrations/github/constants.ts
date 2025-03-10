import type { GithubMember } from '../models';

export const RETRIES = 10;
export const RETRY_ON = [401];

export enum GithubConstants {
    github = 'github',
    username = 'username',
    discussion_started = 'discussion_started',
    discussion_comment = 'discussion_comment',
    pull_request_opened = 'pull_request-opened',
    pull_request_closed = 'pull_request-closed',
    pull_request_reviewed = 'pull_request-reviewed',
    pull_request_assigned = 'pull_request-assigned',
    pull_request_merged = 'pull_request-merged',
    pull_request_comment = 'pull_request-comment',
    pull_request_review_thread_comment = 'pull_request-review-thread-comment',
    issues_opened = 'issues-opened',
    issues_closed = 'issues-closed',
    fork = 'fork',
    star = 'star',
    unstar = 'unstar',
    authored_commit = 'authored-commit',
    unknown = 'unknown',
    pull_request_review_requested = 'pull_request-review-requested',
    bot = 'bot',
    user = 'user',
    organization = 'organization',
    default_timestamp = '1970-01-01T00:00:00Z',
    draft = 'draft'
}

// https://github.com/ghost
export const GHOST_MEMBER: GithubMember = {
    displayName: 'ghost',
    identities: [
        {
            platform: GithubConstants.github,
            type: GithubConstants.username,
            verified: true,
            value: 'ghost',
            sourceId: '10137'
        }
    ],
    attributes: {
        avatarUrl: 'https://avatars.githubusercontent.com/u/10137?v=4',
        bio: "Hi, I'm @ghost! I take the place of user accounts that have been deleted.\n:ghost:\n",
        company: '',
        isBot: false,
        isHireable: false,
        location: 'Nothing to see here, move along.',
        url: 'https://github.com/ghost',
        websiteUrl: ''
    }
};
