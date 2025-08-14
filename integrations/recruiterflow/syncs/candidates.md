<!-- BEGIN GENERATED CONTENT -->
# Candidates

## General Information

- **Description:** Syncs all candidates from RecruiterFlow
- **Version:** 2.0.0
- **Group:** Candidates
- **Scopes:** _None_
- **Endpoint Type:** Sync
- **Model:** `RecruiterFlowCandidate`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/recruiterflow/syncs/candidates.ts)


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
  "full_name": "<string>",
  "first_name": "<string>",
  "last_name": "<string>",
  "profile_picture_link?": "<string>",
  "added_by_name": "<string>",
  "added_by_id": "<number>",
  "added_time": "<string>",
  "latest_activity_time?": "<string>",
  "last_contacted_time?": "<string>",
  "email_addresses": "<string[]>",
  "phone_numbers": "<string[]>",
  "current_designation?": "<string>",
  "current_organization?": "<string>",
  "location_city?": "<string>",
  "location_country?": "<string>",
  "location_full_string?": "<string>",
  "source": "<string | null>",
  "status_name?": "<string>",
  "linkedin_profile_url?": "<string>",
  "github_profile_url?": "<string>",
  "twitter_profile_url?": "<string>",
  "angellist_profile_url?": "<string>",
  "behance_profile_url?": "<string>",
  "dribbble_profile_url?": "<string>",
  "facebook_profile_url?": "<string>",
  "xing_profile_url?": "<string>",
  "resume_links?": [
    {
      "filename": "<string>",
      "link": "<string>"
    }
  ],
  "associated_jobs?": [
    {
      "job_id": "<number>",
      "job_name": "<string>",
      "client_company_name": "<string | null>",
      "current_stage_name": "<string>",
      "is_open": "<boolean>"
    }
  ],
  "custom_fields?": [
    {}
  ]
}
```

### Expected Metadata

```json
{}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recruiterflow/syncs/candidates.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recruiterflow/syncs/candidates.md)

<!-- END  GENERATED CONTENT -->

