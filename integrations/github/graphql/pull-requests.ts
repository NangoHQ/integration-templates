import { userFields, botFields } from '../fields.js';

export function getPullRequestsQuery(LIMIT: number) {
    const query = `
          query GetPullRequests($owner: String!, $repo: String!, $cursor: String) {
            repository(owner: $owner, name: $repo) {
              pullRequests(first: ${LIMIT}, orderBy: {field: UPDATED_AT, direction: DESC}, after: $cursor) {
                pageInfo {
                  startCursor
                  endCursor
                  hasNextPage
                  hasPreviousPage
                }
                nodes {
                  id
                  createdAt
                  updatedAt
                  url
                  title
                  body
                  state
                  authorAssociation
                  labels(first: ${LIMIT}) {
                    nodes {
                      name
                    }
                  }
                  additions
                  deletions
                  changedFiles
                  author {
                    login
                    ... on User {
                      ${userFields}
                    }
                  }
                  assignees(first: ${LIMIT}) {
                    nodes {
                      login
                      ... on User {
                        ${userFields}
                      }
                    }
                  }
                  reviewRequests(first: ${LIMIT}) {
                    nodes {
                      requestedReviewer {
                        ... on User {
                          ${userFields}
                        }
                      }
                    }
                  }
                  comments(first: ${LIMIT}) {
                    pageInfo {
                      endCursor
                      hasNextPage
                    }
                    edges {
                      node {
                        id
                        body
                        createdAt
                        author {
                          login
                          ... on User {
                              ${userFields}
                          }
                          ... on Bot {
                              ${botFields}
                          }
                        }
                      }
                    }
                  }
                  reviewThreads(first: ${LIMIT}) {
                    pageInfo {
                      endCursor
                      hasNextPage
                    }
                    edges {
                      node {
                        id
                        comments(first: ${Math.floor(LIMIT / 4)}) {
                          pageInfo {
                            endCursor
                            hasNextPage
                          }
                          edges {
                            node {
                              id
                              body
                              createdAt
                              author {
                                login
                                ... on User {
                                  ${userFields}
                                }
                                ... on Bot {
                                  ${botFields}
                                }
                              }
                            }
                          }
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

export function getPullRequestComments(LIMIT: number) {
    const commentQuery = `
                query GetComments($owner: String!, $repo: String!, $prId: String!, $cursor: String) {
                  repository(owner: $owner, name: $repo) {
                  pullRequest(number: $prId) {
                    comments(first: ${LIMIT}, after: $cursor) {
                    pageInfo {
                      endCursor
                      hasNextPage
                    }
                    edges {
                      node {
                      id
                      body
                      createdAt
                      author {
                        login
                      }
                      }
                    }
                    }
                  }
                  }
                }
              `;
    return commentQuery;
}
// Function to fetch additional review thread comments
export function getPullRequestReviewThreads(LIMIT: number) {
    const reviewThreadsQuery = `
    query GetThreadComments($owner: String!, $repo: String!, $prNumber: Int!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $prNumber) {
          reviewThreads(first: ${LIMIT}, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                comments(first: ${LIMIT}) {
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                  edges {
                    node {
                      id
                      body
                      createdAt
                      author {
                        login
                        ... on User {
                          ${userFields}
                        }
                        ... on Bot {
                          ${botFields}
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
    return reviewThreadsQuery;
}

/**
 * Query to fetch additional comments for a specific review thread
 * Using edges for comment fetching
 */
export function getReviewThreadComments(LIMIT: number) {
    const threadCommentsQuery = `
    query GetReviewThreadComments($owner: String!, $repo: String!, $prNumber: Int!, $threadId: ID!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $prNumber) {
          reviewThread(id: $threadId) {
            id
            comments(first: ${LIMIT}, after: $cursor) {
              pageInfo {
                hasNextPage
                endCursor
              }
              edges {
                node {
                  id
                  body
                  createdAt
                  author {
                    login
                    ... on User {
                      ${userFields}
                    }
                    ... on Bot {
                      ${botFields}
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
    return threadCommentsQuery;
}
