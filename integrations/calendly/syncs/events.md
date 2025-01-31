<!-- BEGIN GENERATED CONTENT -->
# Events

## General Information

- **Description:** Retrieve all events per a user
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/calendly/syncs/events.ts)


## Endpoint Reference

### Request Endpoint

`GET /events`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "uri": "<string>",
  "name": "<string | null>",
  "meeting_notes_plain": "<string | null>",
  "meeting_notes_html": "<string | null>",
  "status": "<active | canceled>",
  "start_time": "<string>",
  "end_time": "<string>",
  "event_type": "<string>",
  "location": {
    "type": "<string>",
    "location?": "<string>",
    "join_url?": "<string>",
    "status": "<string | null>",
    "additional_info": "<string>"
  },
  "invitees_counter": {
    "total": "<number>",
    "active": "<number>",
    "limit": "<number>"
  },
  "created_at": "<string>",
  "updated_at": "<string>",
  "event_memberships": [
    {
      "user": "<string>",
      "user_email": "<string | null>",
      "user_name": "<string>"
    }
  ],
  "event_guests?": "<EventGuest[] | undefined>",
  "calendar_event": "<CalendarEvent | null>",
  "cancellation?": {
    "canceled_by": "<string>",
    "reason": "<string | null>",
    "canceler_type": "<string>",
    "created_at": "<string>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/calendly/syncs/events.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/calendly/syncs/events.md)

<!-- END  GENERATED CONTENT -->

