# Create Task

## General Information

- **Description:** Create a task using Asana specific fields and return a unified model task. See https://developers.asana.com/reference/createtask for Asana specific fields

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/asana/actions/create-task.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/tasks`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "name": "<string>",
  "workspace": "<string | undefined>",
  "parent": "<string | undefined>",
  "projects": "<string[] | undefined>"
}
```

### Request Response

```json
{
  "__extends": {
    "created_at": "<string | null>",
    "modified_at": "<string | null>"
  },
  "id": "<string>",
  "title": "<string>",
  "url": "<string>",
  "status": "<string>",
  "description": "<string | null>",
  "assignee": "<User | null>",
  "due_date": "<string | null>"
}
```
