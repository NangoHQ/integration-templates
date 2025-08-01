<!-- BEGIN GENERATED CONTENT -->
# Candidates

## General Information

- **Description:** Get all candidates from Gem ATS

- **Version:** 0.0.1
- **Group:** Candidates
- **Scopes:** _None_
- **Endpoint Type:** Sync
- **Model:** `Candidate`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/gem/syncs/candidates.ts)


## Endpoint Reference

### Request Endpoint

`GET /candidates`

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
  "first_name": "<string>",
  "last_name": "<string>",
  "company": "<string | null>",
  "title": "<string | null>",
  "attachments": [
    {
      "filename": "<string>",
      "url": "<string>",
      "type": "<string>",
      "created_at": "<string>"
    }
  ],
  "phone_numbers": [
    {
      "type": "<string>",
      "value": "<string>"
    }
  ],
  "email_addresses": [
    {
      "type": "<string>",
      "value": "<string>",
      "is_primary": "<boolean>"
    }
  ],
  "social_media_addresses": [
    {
      "value": "<string>"
    }
  ],
  "tags": [
    "<string>"
  ],
  "educations": [
    {
      "id": "<string>",
      "school_name": "<string>",
      "degree": "<string>",
      "discipline": "<string>",
      "start_date": "<string>",
      "end_date": "<string>"
    }
  ],
  "employments": [
    {
      "id": "<string>",
      "company_name": "<string>",
      "title": "<string>",
      "start_date": "<string>",
      "end_date": "<string>"
    }
  ],
  "linked_user_ids": [
    "<string>"
  ],
  "created_at": "<string>",
  "updated_at": "<string | null>",
  "last_activity": "<string | null>",
  "deleted_at": "<string | null>",
  "is_private": "<boolean>",
  "applications": [
    {
      "id": "<string>",
      "candidate_id": "<string>",
      "applied_at": "<string>",
      "rejected_at": "<string | null>",
      "last_activity_at": "<string>",
      "source": {
        "id": "<string>",
        "public_name": "<string>"
      },
      "credited_to": "<string>",
      "rejection_reason": "<RejectionReason | null>",
      "jobs": [
        {
          "id": "<string>",
          "name": "<string>"
        }
      ],
      "job_post_id": "<string>",
      "status": "<string>",
      "current_stage": {
        "id": "<string>",
        "name": "<string>"
      },
      "deleted_at": "<string | null>"
    }
  ],
  "application_ids": [
    "<string>"
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gem/syncs/candidates.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gem/syncs/candidates.md)

<!-- END  GENERATED CONTENT -->

