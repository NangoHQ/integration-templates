# Jobs Candidates

## General Information
- **Description:** Fetches a list of candidates for the specified job from workable

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: r_jobs
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/workable/syncs/jobs-candidates.ts)

### Request Endpoint

- **Path:** `/workable/jobs-candidates`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "name": "<string>",
  "firstname": "<string>",
  "lastname": "<string>",
  "headline": "<string>",
  "account": {
    "subdomain": "<string>",
    "name": "<string>"
  },
  "job": {
    "shortcode": "<string>",
    "title": "<string>"
  },
  "stage": "<string>",
  "disqualified": "<boolean>",
  "disqualification_reason": "<string>",
  "hired_at": "<date>",
  "sourced": "<boolean>",
  "profile_url": "<string>",
  "address": "<string>",
  "phone": "<string>",
  "email": "<string>",
  "domain": "<string>",
  "created_at": "<date>",
  "updated_at": "<date>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/workable/syncs/jobs-candidates.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/workable/syncs/jobs-candidates.md)

<!-- END  GENERATED CONTENT -->

undefined