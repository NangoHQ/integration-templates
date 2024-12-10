# Background Checks

## General Information
- **Description:** Fetch all the background checks
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/checkr-partner/syncs/background-checks.ts)

### Request Endpoint

- **Path:** `/background-checks`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "status": "<string>",
  "service_key": "<string>",
  "url": "<string>",
  "candidate_id": "<string>",
  "created_at": "<string>",
  "expires_at?": "<string | undefined>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/checkr-partner/syncs/background-checks.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/checkr-partner/syncs/background-checks.md)

<!-- END  GENERATED CONTENT -->

undefined