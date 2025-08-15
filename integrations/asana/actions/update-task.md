<!-- BEGIN GENERATED CONTENT -->
# Update Task

## General Information

- **Description:** Update a task and be able to assign the task to a specific user
- **Version:** 2.0.0
- **Group:** Tasks
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_asana_updatetask`
- **Input Model:** `ActionInput_asana_updatetask`
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
  "due_at?": "<string>",
  "due_on?": "<string>",
  "completed": "<boolean>",
  "notes": "<string>",
  "projects": "<string[]>",
  "assignee": "<string>",
  "parent": "<string>",
  "tags": "<string[]>",
  "workspace": "<string>",
  "name": "<string>"
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
  "assignee": "<{\"created_at\":\"<string | null>\",\"modified_at\":\"<string | null>\",\"id\":\"<string>\",\"name\":\"<string>\",\"email\":\"<string | null>\",\"avatar_url\":\"<string | null>\"} | <null>>",
  "due_date": "<string | null>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/asana/actions/update-task.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/asana/actions/update-task.md)

<!-- END  GENERATED CONTENT -->

