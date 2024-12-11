<!-- BEGIN GENERATED CONTENT -->
# Trigger Background Check

## General Information

- **Description:** Trigger a background check
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/checkr-partner/actions/trigger-background-check.ts)


## Endpoint Reference

### Request Endpoint

`POST /background-check/trigger`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "city?": "<string>",
  "country": "<string>",
  "state?": "<string>",
  "service_key": "<string>",
  "candidate_id": "<string>",
  "node?": "<string>",
  "tags?": [
    "<string>"
  ]
}
```

### Request Response

```json
{
  "created_at": "<string>",
  "updated_at": "<string>",
  "applicationId": "<any>",
  "url": "<string>",
  "status": "<string>",
  "completed_at": "<string | null>",
  "candidate_id": "<string>",
  "service_key": "<string>",
  "deleted_at": "<string | null>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/checkr-partner/actions/trigger-background-check.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/checkr-partner/actions/trigger-background-check.md)

<!-- END  GENERATED CONTENT -->

