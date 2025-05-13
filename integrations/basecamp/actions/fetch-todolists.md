<!-- BEGIN GENERATED CONTENT -->
# Fetch Todolists

## General Information

- **Description:** Fetch all todolists in a project.Fetch your projects via the fetch-projects action, then locate the project's dock item where "name": "todoset". The id there is your todoSetId.

- **Version:** 1.0.1
- **Group:** Todolists
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `BasecampTodolistsResponse`
- **Input Model:** `BasecampFetchTodolistsInput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/basecamp/actions/fetch-todolists.ts)


## Endpoint Reference

### Request Endpoint

`GET /todolists`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "projectId": "<number>",
  "todoSetId": "<number>"
}
```

### Request Response

```json
{
  "todolists": [
    {
      "id": "<number>",
      "status?": "<string>",
      "visible_to_clients?": "<boolean>",
      "created_at?": "<string>",
      "updated_at?": "<string>",
      "title?": "<string>",
      "inherits_status?": "<boolean>",
      "type?": "<string>",
      "url?": "<string>",
      "app_url?": "<string>",
      "bookmark_url?": "<string>",
      "subscription_url?": "<string>",
      "comments_count?": "<number>",
      "comments_url?": "<string>",
      "position?": "<number>",
      "parent?": "<any>",
      "bucket?": "<any>",
      "creator?": "<any>",
      "description?": "<string>",
      "completed?": "<boolean>",
      "completed_ratio?": "<string>",
      "name?": "<string>",
      "todos_url?": "<string>",
      "groups_url?": "<string>",
      "app_todos_url?": "<string>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/basecamp/actions/fetch-todolists.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/basecamp/actions/fetch-todolists.md)

<!-- END  GENERATED CONTENT -->

