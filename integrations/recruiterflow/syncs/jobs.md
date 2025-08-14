<!-- BEGIN GENERATED CONTENT -->
# Jobs

## General Information

- **Description:** Syncs all jobs from RecruiterFlow
- **Version:** 2.0.0
- **Group:** Jobs
- **Scopes:** _None_
- **Endpoint Type:** Sync
- **Model:** `RecruiterFlowJob`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/recruiterflow/syncs/jobs.ts)


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
  "title": "<string>",
  "apply_link?": "<string>",
  "company_name?": "<string>",
  "company_logo_link?": "<string | null>",
  "locations": [
    {
      "id?": "<number>",
      "name?": "<string>",
      "city?": "<string>",
      "country?": "<string>"
    }
  ],
  "department": "<string>",
  "employment_type": "<string>",
  "job_type_name": "<string | null>",
  "experience_range_start": "<number | null>",
  "experience_range_end": "<number | null>",
  "is_open": "<boolean>",
  "job_status_name": "<string | null>",
  "number_of_openings": "<number>",
  "salary_range_end?": "<number | null>",
  "salary_range_start?": "<number | null>",
  "salary_range_currency?": "<string>",
  "salary_frequency?": "<string | null>",
  "pay_rate_number?": "<string>",
  "pay_rate_currency?": "<string>",
  "pay_rate_frequency_display_name?": "<string>",
  "bill_rate_number?": "<string>",
  "bill_rate_currency?": "<string>",
  "bill_rate_frequency_display_name?": "<string>",
  "contract_start_date?": "<string | null>",
  "contract_end_date?": "<string | null>",
  "work_quantum_number?": "<string>",
  "work_quantum_unit_display_name?": "<string>",
  "work_quantum_frequency_display_name?": "<string>",
  "work_quantum_is_full_time?": "<boolean>",
  "expected_salary_number?": "<number>",
  "expected_salary_currency?": "<string>",
  "expected_fee_number?": "<number>",
  "expected_fee_currency?": "<string>",
  "commission_rate?": "<number | null>",
  "expected_start_date?": "<string>",
  "expected_end_date?": "<string>",
  "custom_fields?": [
    {}
  ],
  "files_links?": "<string[]>"
}
```

### Expected Metadata

```json
{}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recruiterflow/syncs/jobs.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recruiterflow/syncs/jobs.md)

<!-- END  GENERATED CONTENT -->

