# Technical Spec For Nango GitHub Pull Requests And Commits Sync

# Integration Overview

This spec details the implementation of the GitHub pull-requests and commits syncs. The integration will allow users to sync pull requests and commits from their GitHub repositories to their applications.

## Object Operations (Read Only)
Sicne we're developing syncs, the operations will be read-only. The integration will only fetch pull requests and commits from GitHub repositories. Both pull requests and commits will be fetched using the same query: `repository(owner: $owner, name: $name)`, while we specify separate fields for pull requests and commits.

## Methodology
To implement this integration, the GitHub GraphQL API will be the preferred method for implementation. This is due to a few reasons:

- The GraphQL API has better performance than the REST API as it allows for fetching only the required data. This is important as we aim to reduce the amount of data fetched to the barest minimum.

- The rate limit for the GraphQL API is higher than that of the REST API. This is important as we aim to reduce the number of requests made to the API.

- A base implementation for the integration has already been done using the GraphQL API. This will allow for a faster implementation of the syncs.

The integration will make use of the `repository` query while [configurations as allowed by the supported type](#configurations) will be passed to the API via input parameters.

### Schema

The response schema provided by the `repository` query is available in the [explorer section](https://docs.github.com/en/graphql/overview/explorer) of the GitHub GraphQL API documentation. The schema will be used to determine the fields to be fetched for the pull requests and commits.

## Supported Types

Below is a list of supported types in this integration

### Syncs

#### pull-requests
This will fetch pull requests from a specified GitHub repository. The user can provide a few configurations to determine which pull requests are fetched.

##### Configurations {#configurations}

The user has to provide the following configurations to the `pull-requests` sync:

- `repo`: Required. The name of the repository to fetch pull requests from

- `owner`: Required. The owner of the repository

### commits
This will fetch commits from a specified GitHub repository. The user can provide a few configurations to determine which commits are fetched.

##### Configurations {#configurations}
The user has to provide the following configurations to the `commits` sync:

- `repo`: Required. The name of the repository to fetch commits from

- `owner`: Required. The owner of the repository

- `branch`: Optional. The branch to fetch commits from. If not provided, commits from the default branch will be fetched.


### Actions

There are no actions for this integration

### Events

This integration is not expected to listen to any events

## Known Limitations

- GitHub’s API has a rate limit of 5000 points per hour for authenticated users, and 10k points per hour for requests made through an entity (user, app, or bot) that is owned or affiliated with a GitHub Enterprise Cloud organization. More information can be found on the [rate limit section](http://docs.github.com/en/graphql/overview/rate-limits-and-node-limits-for-the-graphql-api#node-limit) of the GitHub GraphQL API documentation.
- Individual calls are limited to 500k nodes maximum. More information can be found on the [node limits section](http://docs.github.com/en/graphql/overview/rate-limits-and-node-limits-for-the-graphql-api#node-limit) of the GitHub GraphQL API documentation.

## Known Edge Cases

None so far

## Object Structure

The structure of a pull request in the integration is shown below:

```yaml
GithubPullRequest:
    id: string
    url: string
    state: string
    title: string
    user: User
    assignees: User[]
    reviewers: User[]
    draft: boolean
    labels: string[]
    reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED'
    latestComment: GithubComment

GithubComment:
    id: string
    body: string
GithubUser:
    id: string
    url: string

GithubCommit:
    id: string
    url: string
    branch: string

```
Where `GithubUser` and `GithubComment` are dependencies of the `PullRequest` object.

### Relationships Between Objects

The `GithubUser` and `GithubComment` are dependencies of the `PullRequest` object and do not have any other applications on their own, independent of `PullRequest`


## Metadata Structure

With the configurations specified [above](#configurations), below is the schema for metadata provided to the `pull-request` sync for the integration:  
```yaml
GithubMetadataInput:
    owner: string
    repo: string
    branch?: string
```

## References

- [Github GraphQL API documentation](https://docs.github.com/en/graphql/overview/explorer)
- [Github GraphQL API rate limits](https://docs.github.com/en/graphql/overview/rate-limits-and-node-limits-for-the-graphql-api#node-limit)
- [Github GraphQL API node limits](https://docs.github.com/en/graphql/overview/rate-limits-and-node-limits-for-the-graphql-api#node-limit)
