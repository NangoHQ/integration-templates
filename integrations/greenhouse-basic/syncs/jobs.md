<!-- BEGIN GENERATED CONTENT -->
# Jobs

## General Information

- **Description:** Fetches a list of all organization's jobs from greenhouse

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/greenhouse-basic/syncs/jobs.ts)


## Endpoint Reference

### Request Endpoint

`GET /greenhouse-basic/jobs`

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
  "name": "<string>",
  "requisition_id": "<string>",
  "notes": "<string>",
  "confidential": "<boolean>",
  "status": "<string>",
  "created_at": "<date>",
  "opened_at": "<date>",
  "closed_at": "<date>",
  "updated_at": "<date>",
  "is_template": "<boolean>",
  "copied_from_id": "<string>",
  "departments": [
    "<string>"
  ],
  "offices": [
    "<string>"
  ],
  "custom_fields": "<object>",
  "keyed_custom_fields": "<object>",
  "hiring_team": {
    "hiring_managers": [
      "<string>"
    ],
    "recruiters": [
      "<string>"
    ],
    "coordinators": [
      "<string>"
    ],
    "sourcers": [
      "<string>"
    ]
  },
  "openings": [
    "<string>"
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/greenhouse-basic/syncs/jobs.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/greenhouse-basic/syncs/jobs.md)

<!-- END  GENERATED CONTENT -->

