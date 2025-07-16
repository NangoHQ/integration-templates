<!-- BEGIN GENERATED CONTENT -->
# Activities

## General Information

- **Description:** Fetches a list of activities from pipedrive

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `activities:read`
- **Endpoint Type:** Sync
- **Model:** `PipeDriveActivity`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/pipedrive/syncs/activities.ts)


## Endpoint Reference

### Request Endpoint

`GET /pipedrive/activities`

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
  "id": "<integer>",
  "done": "<boolean>",
  "type": "<string>",
  "duration": "<date>",
  "subject": "<string>",
  "company_id": "<integer>",
  "user_id": "<integer>",
  "conference_meeting_client": "<string>",
  "conference_meeting_url": "<string>",
  "conference_meeting_id": "<string>",
  "due_date": "<date>",
  "due_time": "<date>",
  "busy_flag": "<boolean>",
  "add_time": "<date>",
  "marked_as_done_time": "<date>",
  "public_description": "<string>",
  "location": "<string>",
  "org_id": "<integer>",
  "person_id": "<integer>",
  "deal_id": "<integer>",
  "active_flag": "<boolean>",
  "update_time": "<date>",
  "update_user_id": "<integer>",
  "source_timezone": "<string>",
  "lead_id": "<string>",
  "location_subpremise": "<string>",
  "location_street_number": "<string>",
  "location_route": "<string>",
  "location_sublocality": "<string>",
  "location_locality": "<string>",
  "location_admin_area_level_1": "<string>",
  "location_admin_area_level_2": "<string>",
  "location_country": "<string>",
  "location_postal_code": "<string>",
  "location_formatted_address": "<string>",
  "project_id": "<integer>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pipedrive/syncs/activities.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pipedrive/syncs/activities.md)

<!-- END  GENERATED CONTENT -->

