import { userFields } from '../fields.js';

export function getPullRequestsQuery() {
    const query = `
          query GetPullRequests($owner: String!, $repo: String!, $cursor: String) {
            repository(owner: $owner, name: $repo) {
              pullRequests(orderBy: {field: UPDATED_AT, direction: DESC}, after: $cursor) {
                pageInfo {
                  startCursor
                  endCursor
                  hasNextPage
                  hasPreviousPage
                }
                nodes {
                  id
                  url
                  title
                  state
                  assignees(first: 100) {
                    pageInfo {
                      startCursor
                      endCursor
                      hasNextPage
                      hasPreviousPage
                    }
                    nodes {
                      login
                      ... on User {
                        ${userFields}
                      }
                    }
                  }
                  reviewRequests(first: 100) {
                    pageInfo {
                      startCursor
                      endCursor
                      hasNextPage
                      hasPreviousPage
                    }
                    nodes {
                      requestedReviewer {
                        ... on User {
                          ${userFields}
                        }
                      }
                    }
                  }
                  isDraft
                  labels(first: 100) {
                    pageInfo {
                      startCursor
                      endCursor
                      hasNextPage
                      hasPreviousPage
                    }
                    nodes {
                      name
                    }
                  }
                  reviewDecision
                  reviews (last: 1) {
                    nodes {
                      id
                      body
                      author {
                        login
                        url
                      }
                      createdAt
                      comments (last: 1) {
                        nodes {
                          id
                          body
                          author {
                            login
                            url
                          }
                          createdAt
                        }
                      }
                    }
                  }
                  author {
                    login
                    ... on User {
                      ${userFields}
                    }
                  }
                  createdAt
                  updatedAt
                  body
                  comments(last: 1) {
                    nodes {
                      id
                      body
                      createdAt
                      author {
                        login
                        ... on User {
                            ${userFields}
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `;
    return query;
}
