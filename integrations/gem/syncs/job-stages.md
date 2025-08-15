<!-- BEGIN GENERATED CONTENT -->
# Job Stages

## General Information

- **Description:** Get a list of all job stages from Gem ATS
- **Version:** 1.0.0
- **Group:** Job Stages
- **Scopes:** _None_
- **Endpoint Type:** Sync
- **Model:** `JobStage`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/gem/syncs/job-stages.ts)


## Endpoint Reference

### Request Endpoint

`GET /job-stages`

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
  "created_at": "<string>",
  "updated_at": "<string>",
  "deleted_at": "<string | null>",
  "active": "<boolean>",
  "job_id": "<string>",
  "priority": "<number>",
  "interviews": [
    {
      "id": "<string>",
      "name": "<string>",
      "schedulable": "<boolean>",
      "estimated_minutes": "<number>",
      "default_interviewer_users": [
        {
          "id": "<string>",
          "name": "<string>",
          "first_name": "<string>",
          "last_name": "<string>",
          "employee_id": "<string>"
        }
      ],
      "interview_kit": {
        "id": "<string>",
        "content": "<string>",
        "questions": [
          {
            "id": "<string>",
            "name": "<string>"
          }
        ]
      },
      "deleted_at": "<string | null>",
      "job_stage_interview_item_id": "<string>"
    }
  ]
}
```

### Expected Metadata

```json
{}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gem/syncs/job-stages.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gem/syncs/job-stages.md)

<!-- END  GENERATED CONTENT -->

