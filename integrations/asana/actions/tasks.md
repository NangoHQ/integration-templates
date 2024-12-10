# Tasks

## General Information
- **Description:** Retrieve all tasks that exist in the workspace
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/asana/syncs/tasks.ts)

### Request Endpoint

- **Path:** `/tasks`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "created_at": "<string | null>",
  "modified_at": "<string | null>",
  "id": "<string>",
  "title": "<string>",
  "url": "<string>",
  "status": "<string>",
  "description": "<string | null>",
  "assignee": "<User | null>",
  "due_date": "<string | null>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/asana/syncs/tasks.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/asana/syncs/tasks.md)

<!-- END  GENERATED CONTENT -->

undefined