<!-- BEGIN GENERATED CONTENT -->
# Applications

## General Information

- **Description:** Fetches a list of all organization's applications from greenhouse
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Sync
- **Model:** `GreenhouseApplication`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/greenhouse-basic/syncs/applications.ts)


## Endpoint Reference

### Request Endpoint

`GET /greenhouse-basic/applications`

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
  "candidate_id": "<string>",
  "prospect": "<boolean>",
  "applied_at": "<Date>",
  "rejected_at": "<Date>",
  "last_activity_at": "<Date>",
  "location": {
    "address": "<string>"
  },
  "source": {
    "id": "<string>",
    "public_name": "<string>"
  },
  "credited_to": {
    "id": "<string>",
    "first_name": "<string>",
    "last_name": "<string>",
    "name": "<string>",
    "employee_id": "<string>"
  },
  "rejection_reason": {
    "id": "<string>",
    "name": "<string>",
    "type": {
      "id": "<string>",
      "name": "<string>"
    }
  },
  "rejection_details": {
    "custom_fields": {},
    "keyed_custom_fields": {}
  },
  "jobs": "<string[]>",
  "job_post_id": "<string>",
  "status": "<string>",
  "current_stage": {
    "id": "<string>",
    "name": "<string>"
  },
  "answers": "<string[]>",
  "prospective_office": {
    "primary_contact_user_id": "<string>",
    "parent_id": "<string>",
    "name": "<string>",
    "location": {
      "name": "<string>"
    },
    "id": "<string>",
    "external_id": "<string>",
    "child_ids": "<string[]>"
  },
  "prospective_department": {
    "parent_id": "<string>",
    "name": "<string>",
    "id": "<string>",
    "external_id": "<string>",
    "child_ids": "<string[]>"
  },
  "prospect_detail": {
    "prospect_pool": {
      "id": "<string>",
      "name": "<string>"
    },
    "prospect_stage": {
      "id": "<string>",
      "name": "<string>"
    },
    "prospect_owner": {
      "id": "<string>",
      "name": "<string>"
    }
  },
  "custom_fields": {},
  "keyed_custom_fields": {},
  "attachments": "<unknown[]>"
}
```

### Expected Metadata

```json
{}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/greenhouse-basic/syncs/applications.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/greenhouse-basic/syncs/applications.md)

<!-- END  GENERATED CONTENT -->

