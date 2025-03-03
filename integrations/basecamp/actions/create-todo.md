<!-- BEGIN GENERATED CONTENT -->
# Create Todo

## General Information

- **Description:** Create a new to-do in a specific project + list. Fetch your todolists via the fetch-todolists action. Identify the list you want to add the todo to and retrieve the id from there.
- **Version:** 1.0.0
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
  "id": "<number>",
  "status": "<string>",
  "visible_to_clients": "<boolean>",
  "created_at": "<string>",
  "updated_at": "<string>",
  "title": "<string>",
  "inherits_status": "<boolean>",
  "type": "<string>",
  "url": "<string>",
  "app_url": "<string>",
  "bookmark_url": "<string>",
  "subscription_url": "<string>",
  "comments_count": "<integer>",
  "comments_url": "<string>",
  "position": "<integer>",
  "parent": {
    "id": "<number>",
    "title": "<string>",
    "type": "<string>",
    "url": "<string>",
    "app_url": "<string>"
  },
  "bucket": {
    "id": "<number>",
    "name": "<string>",
    "type": "<string>"
  },
  "creator": "<any>",
  "description": "<string>",
  "completed": "<boolean>",
  "content": "<string>",
  "starts_on": "<string>",
  "due_on": "<string>",
  "assignees": [
    "<any>"
  ],
  "completion_subscribers": [
    "<any>"
  ],
  "completion_url": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/basecamp/actions/create-todo.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/basecamp/actions/create-todo.md)

<!-- END  GENERATED CONTENT -->

