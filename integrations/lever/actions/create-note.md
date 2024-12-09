# Create Note

## General Information

- **Description:** Action to create a note and add it to an opportunity.

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: notes:write:admin
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever-sandbox/actions/create-note.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/notes`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "opportunityId": "<string>",
  "perform_as": "<string | undefined>",
  "note_id": "<string | undefined>",
  "value": "<string | undefined>",
  "secret": "<boolean | undefined>",
  "score": "<number | undefined>",
  "notifyFollowers": "<boolean | undefined>",
  "createdAt": "<number | undefined>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "text": "<string>",
  "fields": [
    "<string>"
  ],
  "user": "<string>",
  "secret": "<boolean>",
  "completedAt": "<number>",
  "createdAt": "<number>",
  "deletedAt": "<number>"
}
```
