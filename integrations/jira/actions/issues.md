# Issues

## General Information
- **Description:** Fetches a list of issues from Jira

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: read:jira-work
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/jira/syncs/issues.ts)

### Request Endpoint

- **Path:** `/issues`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "createdAt": "<string>",
  "updatedAt": "<string>",
  "id": "<string>",
  "key": "<string>",
  "summary": "<string>",
  "issueType": "<string>",
  "status": "<string>",
  "assignee": "<string | null>",
  "url": "<string>",
  "webUrl": "<string>",
  "projectId": "<string>",
  "projectKey": "<string>",
  "projectName": "<string>",
  "comments": {
    "0": {
      "createdAt": "<string>",
      "updatedAt": "<string>",
      "id": "<string>",
      "author": {
        "accountId": "<string | null>",
        "active": "<boolean>",
        "displayName": "<string>",
        "emailAddress": "<string | null>"
      },
      "body": "<object>"
    }
  }
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/jira/syncs/issues.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/jira/syncs/issues.md)

<!-- END  GENERATED CONTENT -->

undefined