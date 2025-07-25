<!-- BEGIN GENERATED CONTENT -->
# Candidates

## General Information

- **Description:** Syncs all candidates from RecruiterFlow
- **Version:** 1.0.2
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
  "id": "<number>",
  "full_name": "<string>",
  "first_name": "<string>",
  "last_name": "<string>",
  "profile_picture_link?": "<string | undefined>",
  "added_by_name": "<string>",
  "added_by_id": "<number>",
  "added_time": "<string>",
  "latest_activity_time?": "<string | undefined>",
  "last_contacted_time?": "<string | undefined>",
  "email_addresses": [
    "<string>"
  ],
  "phone_numbers": [
    "<string>"
  ],
  "current_designation?": "<string | undefined>",
  "current_organization?": "<string | undefined>",
  "location_city?": "<string | undefined>",
  "location_country?": "<string | undefined>",
  "location_full_string?": "<string | undefined>",
  "source": "<string | null>",
  "status_name?": "<string | undefined>",
  "linkedin_profile_url?": "<string | undefined>",
  "github_profile_url?": "<string | undefined>",
  "twitter_profile_url?": "<string | undefined>",
  "angellist_profile_url?": "<string | undefined>",
  "behance_profile_url?": "<string | undefined>",
  "dribbble_profile_url?": "<string | undefined>",
  "facebook_profile_url?": "<string | undefined>",
  "xing_profile_url?": "<string | undefined>",
  "resume_links?": "<RecruiterFlowResumeLink[] | undefined>",
  "associated_jobs?": "<RecruiterFlowAssociatedJob[] | undefined>",
  "custom_fields?": "<RecruiterFlowCustomFields[] | undefined>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recruiterflow/syncs/candidates.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recruiterflow/syncs/candidates.md)

<!-- END  GENERATED CONTENT -->

