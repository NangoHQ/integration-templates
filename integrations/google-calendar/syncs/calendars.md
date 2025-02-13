<!-- BEGIN GENERATED CONTENT -->
# Calendars

## General Information

- **Description:** Sync the calendars list of the user

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `https://www.googleapis.com/auth/calendar.readonly`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-calendar/syncs/calendars.ts)


## Endpoint Reference

### Request Endpoint

`GET /google-calendar/calendars`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.
- **ids:** `(optional, string[])` An array of string containing a list of your records IDs. The list will be filtered to include only the records with a matching ID.

### Request Body

_No request body_

### Request Response

```json
{
  "kind": "<string>",
  "etag": "<string>",
  "id": "<string>",
  "summary": "<string>",
  "description": "<string>",
  "location": "<string>",
  "timeZone": "<string>",
  "summaryOverride": "<string>",
  "colorId": "<string>",
  "backgroundColor": "<string>",
  "foregroundColor": "<string>",
  "hidden": "<boolean>",
  "selected": "<boolean>",
  "accessRole": "<string>",
  "defaultReminders": {
    "0": {
      "method": "<string>",
      "minutes": "<integer>"
    }
  },
  "notificationSettings": {
    "notifications": {
      "0": {
        "type": "<string>",
        "method": "<string>"
      }
    }
  },
  "primary": "<boolean>",
  "deleted": "<boolean>",
  "conferenceProperties": {
    "allowedConferenceSolutionTypes": {
      "0": "<string>"
    }
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-calendar/syncs/calendars.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-calendar/syncs/calendars.md)

<!-- END  GENERATED CONTENT -->

