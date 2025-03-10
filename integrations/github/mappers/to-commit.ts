import type { GithubCommit, NangoSync } from '../../models';
import { GithubConstants } from '../constants';
import { getScore } from '../helpers/get-score';
import type { CommitGQL } from '../types';
import { toMember } from './to-member.js';

export async function toCommit(nango: NangoSync, commit: CommitGQL, integrationId: string, repoURL: string): Promise<GithubCommit> {
    return {
        id: `commit-${commit.oid}`,
        integrationId,
        activityData: {
            timestamp: commit?.authoredDate ?? GithubConstants.default_timestamp,
            sourceId: commit.oid,
            // this is an expensive query so is looked up and attached in a separate query
            sourceParentId: '',
            platform: GithubConstants.github,
            body: commit.message,
            isContribution: true,
            type: GithubConstants.authored_commit,
            score: getScore('authored-commit'),
            channel: repoURL,
            url: commit?.url ?? '',
            attributes: {
                insertions: commit ? commit.additions : 0,
                deletions: commit ? commit.deletions : 0,
                lines: 'additions' in commit && 'deletions' in commit ? commit.additions - commit.deletions : 0,
                isMerge: commit.parents.totalCount > 1
            },
            member: await toMember(`${commit.oid} / ${commit.url}`, nango, commit?.author?.user)
        }
    };
}
