import type { GithubCommit } from '../../models.js';
import type { CommitGraphQLResponse } from '../types.js';

export function toCommit(node: CommitGraphQLResponse, branch: string | undefined): GithubCommit {
    return {
        id: node.id,
        url: node.url,
        branch: branch || '',
        author: {
            id: node.author.user?.login ?? '',
            url: node.author.user?.url ?? ''
        },
        message: node.message,
        date: node.authoredDate
    };
}
