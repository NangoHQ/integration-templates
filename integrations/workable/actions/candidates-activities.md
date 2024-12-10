# Candidates Activities

## General Information
- **Description:** Fetches a list of activity streams of the given candidate

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: r_candidates
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/workable/syncs/candidates-activities.ts)

### Request Endpoint

- **Path:** `/workable/candidates-activities`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "action": "<string>",
  "stage_name": "<string>",
  "created_at": "<date>",
  "body": "<string>",
  "member": {
    "id": "<string>",
    "name": "<string>"
  },
  "rating": "<object>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/workable/syncs/candidates-activities.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/workable/syncs/candidates-activities.md)

<!-- END  GENERATED CONTENT -->

undefined