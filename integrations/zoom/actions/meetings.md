# Meetings

## General Information
- **Description:** Fetches a list of meetings from Zoom

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: meeting:read
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zoom/syncs/meetings.ts)

### Request Endpoint

- **Path:** `/meetings`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "topic": "<string>",
  "startTime": "<string>",
  "duration": "<number>",
  "timezone": "<string>",
  "joinUrl": "<string>",
  "createdAt": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoom/syncs/meetings.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoom/syncs/meetings.md)

<!-- END  GENERATED CONTENT -->

undefined