<!-- BEGIN GENERATED CONTENT -->
# Create Note

## General Information

- **Description:** Action to create a note and add it to an opportunity.
- **Version:** 2.0.0
- **Group:** Notes
- **Scopes:** `notes:write:admin`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_lever_createnote`
- **Input Model:** `ActionInput_lever_createnote`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever/actions/create-note.ts)


## Endpoint Reference

### Request Endpoint

`POST /notes`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "opportunityId": "<string>",
  "perform_as": "<string>",
  "note_id": "<string>",
  "value": "<string>",
  "secret": "<boolean>",
  "score": "<number>",
  "notifyFollowers": "<boolean>",
  "createdAt": "<number>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "text": "<string>",
  "fields": "<string[]>",
  "user": "<string>",
  "secret": "<boolean>",
  "completedAt": "<number>",
  "createdAt": "<number>",
  "deletedAt": "<number>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/create-note.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/create-note.md)

<!-- END  GENERATED CONTENT -->

