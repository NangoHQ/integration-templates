<!-- BEGIN GENERATED CONTENT -->
# Update Task

## General Information

- **Description:** Update a task and be able to assign the task to a specific user
- **Version:** 0.0.1
- **Group:** Tasks
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/asana/actions/update-task.ts)


## Endpoint Reference

### Request Endpoint

`PATCH /tasks`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "due_at": "<string | undefined>",
  "due_on": "<string | undefined>",
  "completed": "<boolean | undefined>",
  "notes": "<string | undefined>",
  "projects": "<string[] | undefined>",
  "assignee": "<string | undefined>",
  "parent": "<string | undefined>",
  "tags": "<string[] | undefined>",
  "workspace": "<string | undefined>",
  "name": "<string | undefined>"
}
```

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/asana/actions/update-task.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/asana/actions/update-task.md)

<!-- END  GENERATED CONTENT -->

