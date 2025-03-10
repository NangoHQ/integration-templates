import { userFields } from '../fields.js';

export const commitsQuery = `
query GetCommits($owner: String!, $repo: String!, $pageSize: Int!, $cursor: String, $since: GitTimestamp) {
  repository(owner: $owner, name: $repo) {
    url
    defaultBranchRef {
      name
      target {
        ... on Commit {
          history(first: $pageSize, after: $cursor, since: $since) {
            nodes {
              additions
              deletions
              parents {
                totalCount
              }
              id
              oid
              message
              authoredDate
              author {
                user {
                  ... on User {
                    ${userFields}
                  }
                }
                email
                name
              }
              url
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    }
  }
}
`;

export const prsByOidsQuery = `
query($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on Commit {
      oid
      associatedPullRequests(first: 1) {
        nodes {
          id
        }
      }
    }
  }
}
`;
