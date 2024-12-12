<!-- BEGIN GENERATED CONTENT -->
# List Events

## General Information

- **Description:** This sync will be used to sync all of the events managed by your Calendar. See https://docs.lu.ma/reference/calendar-list-events for more details.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/luma/syncs/list-events.ts)


## Endpoint Reference

### Request Endpoint

`GET /luma/list-events`

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
  "created_at": "<string>",
  "start_at": "<string>",
  "end_at": "<string>",
  "id": "<string>",
  "cover_url": "<string>",
  "name": "<string>",
  "description": "<string>",
  "description_md": "<string>",
  "series_api_id": "<string | null>",
  "duration_interval_iso8601": "<string>",
  "geo_latitude": "<string | null>",
  "geo_longitude": "<string | null>",
  "geo_address_json": "<GeoAddress | null>",
  "url": "<string>",
  "timezone": "<string>",
  "event_type": "<string>",
  "user_api_id": "<string>",
  "visibility": "<string>",
  "meeting_url": "<string | null>",
  "zoom_meeting_url": "<string | null>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/luma/syncs/list-events.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/luma/syncs/list-events.md)

<!-- END  GENERATED CONTENT -->

