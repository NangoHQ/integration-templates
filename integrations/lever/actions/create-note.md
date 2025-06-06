<!-- BEGIN GENERATED CONTENT -->
# Create Note

## General Information

- **Description:** Action to create a note and add it to an opportunity.

- **Version:** 1.0.1
- **Group:** Notes
- **Scopes:** `notes:write:admin`
- **Endpoint Type:** Action
- **Model:** `LeverOpportunityNote`
- **Input Model:** `LeverCreateNoteInput`
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

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/create-note.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/create-note.md)

<!-- END  GENERATED CONTENT -->

