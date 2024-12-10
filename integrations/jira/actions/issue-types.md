# Issue Types

## General Information
- **Description:** Fetches a list of issue types for a project
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: read:jira-work
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/jira/syncs/issue-types.ts)

### Request Endpoint

- **Path:** `/issue-types`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "projectId": "<string>",
  "id": "<string>",
  "name": "<string>",
  "description": "<string | null>",
  "url": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/jira/syncs/issue-types.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/jira/syncs/issue-types.md)

<!-- END  GENERATED CONTENT -->

undefined