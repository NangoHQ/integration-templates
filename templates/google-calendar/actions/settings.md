<!-- BEGIN GENERATED CONTENT -->
# Settings

## General Information

- **Description:** Fetch all user settings from Google Calendar

- **Version:** 1.0.1
- **Group:** Users
- **Scopes:** `https://www.googleapis.com/auth/calendar.settings.readonly`
- **Endpoint Type:** Action
- **Model:** `SettingsResponse`
- **Input Model:** _None_
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-calendar/actions/settings.ts)


## Endpoint Reference

### Request Endpoint

`GET /settings`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "settings": [
    {
      "kind": "<string>",
      "etag": "<string>",
      "id": "<string>",
      "value": "<string>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-calendar/actions/settings.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-calendar/actions/settings.md)

<!-- END  GENERATED CONTENT -->

