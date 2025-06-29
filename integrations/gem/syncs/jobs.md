<!-- BEGIN GENERATED CONTENT -->
# Jobs

## General Information

- **Description:** Get a list of all jobs from Gem ATS

- **Version:** 0.0.1
- **Group:** Jobs
- **Scopes:** _None_
- **Endpoint Type:** Sync
- **Model:** `Job`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/gem/syncs/jobs.ts)


## Endpoint Reference

### Request Endpoint

`GET /jobs`

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
  "id": "<string>",
  "name": "<string>",
  "requisition_id": "<string>",
  "confidential": "<boolean>",
  "status": "<string>",
  "created_at": "<string>",
  "opened_at": "<string>",
  "closed_at": "<string | null>",
  "deleted_at": "<string | null>",
  "updated_at": "<string>",
  "is_template": "<boolean>",
  "departments": [
    {
      "id": "<string>",
      "name": "<string>",
      "parent_id": "<string>",
      "child_ids": [
        "<string>"
      ],
      "parent_department_external_id": "<string>",
      "child_department_external_ids": [
        "<string>"
      ],
      "deleted_at": "<string>"
    }
  ],
  "offices": [
    {
      "id": "<string>",
      "name": "<string>",
      "location": {
        "name": "<string>"
      },
      "parent_id": "<string>",
      "child_ids": [
        "<string>"
      ],
      "parent_office_external_id": "<string>",
      "child_office_external_ids": [
        "<string>"
      ],
      "deleted_at": "<string>"
    }
  ],
  "hiring_team": {
    "hiring_managers": "<UserLite[] | null>",
    "recruiters": "<UserLite[] | null>",
    "coordinators": "<UserLite[] | null>",
    "sourcers": "<UserLite[] | null>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gem/syncs/jobs.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gem/syncs/jobs.md)

<!-- END  GENERATED CONTENT -->

