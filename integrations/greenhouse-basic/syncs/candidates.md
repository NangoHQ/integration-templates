# Candidates

## General Information

- **Description:** Fetches a list of all organization's candidates from greenhouse

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/greenhouse-basic/syncs/candidates.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/greenhouse-basic/candidates`
- **Method:** `GET`

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
  "first_name": "<string>",
  "last_name": "<string>",
  "company": "<string>",
  "title": "<string>",
  "created_at": "<date>",
  "updated_at": "<date>",
  "last_activity": "<date>",
  "is_private": "<boolean>",
  "photo_url": "<string>",
  "attachments": [
    "<any>"
  ],
  "application_ids": [
    "<string>"
  ],
  "phone_numbers": [
    "<string>"
  ],
  "addresses": [
    "<any>"
  ],
  "email_addresses": [
    "<string>"
  ],
  "website_addresses": [
    "<string>"
  ],
  "social_media_addresses": [
    "<string>"
  ],
  "recruiter": {
    "id": "<string>",
    "first_name": "<string>",
    "last_name": "<string>",
    "name": "<string>",
    "employee_id": "<string>"
  },
  "coordinator": {
    "id": "<string>",
    "first_name": "<string>",
    "last_name": "<string>",
    "name": "<string>",
    "employee_id": "<string>"
  },
  "can_email": "<boolean>",
  "tags": [
    "<string>"
  ],
  "applications": [
    "<string>"
  ],
  "educations": [
    "<string>"
  ],
  "employments": [
    "<string>"
  ],
  "linked_user_ids": "<string>",
  "custom_fields": "<object>",
  "keyed_custom_fields": "<object>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/greenhouse-basic/syncs/candidates.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/greenhouse-basic/syncs/candidates.md)

<!-- END  GENERATED CONTENT -->
