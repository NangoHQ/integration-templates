<!-- BEGIN GENERATED CONTENT -->
# Jobs

## General Information

- **Description:** Syncs all jobs from RecruiterFlow
- **Version:** 0.0.1
- **Group:** Others
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
  "id": "<number>",
  "title": "<string>",
  "apply_link": "<string>",
  "company_name": "<string>",
  "company_logo_link?": "<string | undefined>",
  "locations": [
    {
      "id": "<number>",
      "name": "<string>",
      "city": "<string | undefined>",
      "country": "<string | undefined>"
    }
  ],
  "department": "<string>",
  "employment_type": "<string>",
  "job_type_name": "<string>",
  "experience_range_start": "<number>",
  "experience_range_end": "<number>",
  "is_open": "<boolean>",
  "job_status_name": "<string>",
  "number_of_openings": "<number>",
  "salary_range_end?": "<number | undefined>",
  "salary_range_start?": "<number | undefined>",
  "salary_range_currency?": "<string | undefined>",
  "salary_frequency?": "<string | undefined>",
  "pay_rate_number?": "<string | undefined>",
  "pay_rate_currency?": "<string | undefined>",
  "pay_rate_frequency_display_name?": "<string | undefined>",
  "bill_rate_number?": "<string | undefined>",
  "bill_rate_currency?": "<string | undefined>",
  "bill_rate_frequency_display_name?": "<string | undefined>",
  "contract_start_date?": "<string | undefined>",
  "contract_end_date?": "<string | undefined>",
  "work_quantum_number?": "<string | undefined>",
  "work_quantum_unit_display_name?": "<string | undefined>",
  "work_quantum_frequency_display_name?": "<string | undefined>",
  "work_quantum_is_full_time?": "<boolean | undefined>",
  "expected_salary_number?": "<number | undefined>",
  "expected_salary_currency?": "<string | undefined>",
  "expected_fee_number?": "<number | undefined>",
  "expected_fee_currency?": "<string | undefined>",
  "commission_rate?": "<number | undefined>",
  "expected_start_date?": "<string | undefined>",
  "expected_end_date?": "<string | undefined>",
  "custom_fields?": "<RecruiterFlowCustomFields[] | undefined>",
  "files_links?": "<string[] | undefined>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recruiterflow/syncs/jobs.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recruiterflow/syncs/jobs.md)

<!-- END  GENERATED CONTENT -->

