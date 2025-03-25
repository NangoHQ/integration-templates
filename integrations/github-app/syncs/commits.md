<!-- BEGIN GENERATED CONTENT -->
# Commits

## General Information

- **Description:** Get all pull commits from a Github repository.

- **Version:** 0.0.1
- **Group:** Commits
- **Scopes:** _None_
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/github-app/syncs/commits.ts)


## Endpoint Reference

### Request Endpoint

`GET /commits`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.
- **ids:** `(optional, string[])` An array of string containing a list of your records IDs. The list will be filtered to include only the records with a matching ID.

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "url": "<string>",
  "branch": "<string>",
  "author": {
    "id": "<string>",
    "url?": "<string>"
  },
  "message": "<string>",
  "date": "<string>"
}
```

### Expected Metadata

```json
{
  "owner": "<string>",
  "repo": "<string>",
  "syncWindowMinutes?": "<number>",
  "branch?": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/github-app/syncs/commits.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/github-app/syncs/commits.md)

<!-- END  GENERATED CONTENT -->
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

### Pull Request
The structure of a pull request in the integration is shown below:

```yaml
GithubComment:
    id: string
    body: string
    user: GithubUser
    createdAt: string

GithubUser:
    id: string
    url: string

GithubPullRequest:
    id: string
    url: string
    state: string
    title: string
    user: GithubUser
    assignees: GithubUser[]
    reviewers: GithubUser[]
    draft: boolean
    labels: string[]
    reviewDecision: APPROVED | CHANGES_REQUESTED | REVIEW_REQUIRED
    latestComment: GithubComment
```
Where `GithubUser` and `GithubComment` are dependencies of the `PullRequest` object.

### Commit
The structure of a commit in the integration is shown below:

```yaml
GithubUser:
    id: string
    url: string

GithubCommit:
    id: string
    url: string
    branch: string
    author: GithubUser
    message: string
    date: string
```

Where `GithubUser` is a dependency of the `Commit` object.

### Relationships Between Objects

The `GithubUser` and `GithubComment` are dependencies of the `PullRequest` object and do not have any other applications on their own, independent of `PullRequest`


## Metadata Structure

With the configurations specified [above](#configurations), below is the schema for metadata provided to the `pull-request` sync for the integration:  
```yaml
GithubMetadataInput:
    owner: string
    repo: string
    syncWindowMinutes?: number
    branch?: string
```

- `owner`: The owner of the repository to fetch pull requests from
- `repo`: The name of the repository to fetch pull requests from
- `syncWindowMinutes`: How far back in time to fetch pull requests from. If not provided, it defaults to 2 years.
- `branch`: The branch to fetch commits from. If not provided, commits from the default branch will be fetched. This only applies to the `commits` sync.

## References

- [Github GraphQL API documentation](https://docs.github.com/en/graphql/overview/explorer)
- [Github GraphQL API rate limits](https://docs.github.com/en/graphql/overview/rate-limits-and-node-limits-for-the-graphql-api#node-limit)
- [Github GraphQL API node limits](https://docs.github.com/en/graphql/overview/rate-limits-and-node-limits-for-the-graphql-api#node-limit)
