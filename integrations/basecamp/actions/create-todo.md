<!-- BEGIN GENERATED CONTENT -->
# Create Todo

## General Information

- **Description:** Create a new to-do in a specific project + list
- **Version:** 0.0.1
- **Group:** Todos
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/basecamp/actions/create-todo.ts)


## Endpoint Reference

### Request Endpoint

`POST /todos`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "projectId": "<number>",
  "todoListId": "<number>",
  "content": "<string>",
  "description?": "<string>",
  "due_on?": "<string>",
  "starts_on?": "<string>",
  "notify?": "<boolean>",
  "assigneeEmails?": [
    "<string>"
  ],
  "completionSubscriberEmails?": [
    "<string>"
  ]
}
```

### Request Response

```json
{
  "id": "<string>",
  "content": "<string>",
  "description?": "<string>",
  "due_on?": "<string>",
  "completed": "<boolean>",
  "created_at": "<string>",
  "updated_at": "<string>",
  "bucket_id": "<number>",
  "assignees?": {}
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/basecamp/actions/create-todo.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/basecamp/actions/create-todo.md)

<!-- END  GENERATED CONTENT -->

