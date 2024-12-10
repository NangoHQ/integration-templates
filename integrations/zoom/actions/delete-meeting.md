# Delete Meeting

## General Information

- **Description:** Deletes a meeting in Zoom
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: meeting:write
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zoom/actions/delete-meeting.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/meetings`
- **Method:** `DELETE`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoom/actions/delete-meeting.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoom/actions/delete-meeting.md)
