import { GithubConstants } from '../constants.js';

export function getScore(type: string) {
    if (type === GithubConstants.discussion_started) {
        return 8;
    }
    if (type === GithubConstants.pull_request_opened) {
        return 10;
    }
    if (type === GithubConstants.pull_request_closed) {
        return 8;
    }
    if (type === GithubConstants.pull_request_review_requested) {
        return 2;
    }
    if (type === GithubConstants.pull_request_reviewed) {
        return 8;
    }
    if (type === GithubConstants.pull_request_assigned) {
        return 2;
    }
    if (type === GithubConstants.pull_request_merged) {
        return 6;
    }
    if (type === GithubConstants.issues_opened) {
        return 8;
    }
    if (type === GithubConstants.issues_closed) {
        return 6;
    }
    if (type === GithubConstants.fork) {
        return 4;
    }
    if (type === GithubConstants.star) {
        return 2;
    }
    if (type === GithubConstants.unstar) {
        return -2;
    }
    if (type === GithubConstants.authored_commit) {
        return 2;
    }
    if (type === GithubConstants.unknown) {
        return -99;
    } else return -100;
}
