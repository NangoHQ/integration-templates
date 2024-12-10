# Jobs

## General Information
- **Description:** Fetches a list of jobs from workable

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: r_jobs
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/workable/syncs/jobs.ts)

### Request Endpoint

- **Path:** `/workable/jobs`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "title": "<string>",
  "full_title": "<string>",
  "shortcode": "<string>",
  "code": "<string>",
  "state": "<string>",
  "sample": "<boolean>",
  "department": "<string>",
  "department_hierarchy": {},
  "url": "<string>",
  "application_url": "<string>",
  "shortlink": "<string>",
  "location": {
    "location_str": "<string>",
    "country": "<string>",
    "country_code": "<string>",
    "region": "<string>",
    "region_code": "<string>",
    "city": "<string>",
    "zip_code": "<string>",
    "telecommuting": "<boolean>",
    "workplace_type": "<string>"
  },
  "locations": {},
  "salary": {
    "salary_from": "<number>",
    "salary_to": "<number>",
    "salary_currency": "<string>"
  },
  "created_at": "<date>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/workable/syncs/jobs.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/workable/syncs/jobs.md)

<!-- END  GENERATED CONTENT -->

undefined