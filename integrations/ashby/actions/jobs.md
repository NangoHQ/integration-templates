# Jobs

## General Information
- **Description:** Fetches a list of all jobs from your ashby account

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: jobslastsyncToken
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ashby/syncs/jobs.ts)

### Request Endpoint

- **Path:** `/jobs`
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
  "confidential": "<boolean>",
  "status": "<string>",
  "employmentType": "<string>",
  "locationId": "<string>",
  "departmentId": "<string>",
  "defaultInterviewPlanId": "<string>",
  "interviewPlanIds": [
    "<string>"
  ],
  "customFields": [
    "<string>"
  ],
  "jobPostingIds": [
    "<string>"
  ],
  "customRequisitionId": "<string>",
  "hiringTeam": [
    "<string>"
  ],
  "updatedAt": "<date>",
  "location": {
    "id": "<string>",
    "name": "<string>",
    "isArchived": "<boolean>",
    "address": {
      "postalAddress": {
        "addressCountry": "<string>",
        "addressRegion": "<string>",
        "addressLocality": "<string>"
      }
    },
    "isRemote": "<boolean>"
  },
  "openings": [
    "<string>"
  ]
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/syncs/jobs.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ashby/syncs/jobs.md)

<!-- END  GENERATED CONTENT -->

undefined