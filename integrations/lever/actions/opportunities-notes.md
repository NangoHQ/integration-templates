# Opportunities Notes

## General Information
- **Description:** Fetches a list of all notes for every single opportunity

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: notes:read:admin
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever-sandbox/syncs/opportunities-notes.ts)

### Request Endpoint

- **Path:** `/notes`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

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


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/syncs/opportunities-notes.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/syncs/opportunities-notes.md)

<!-- END  GENERATED CONTENT -->







undefined