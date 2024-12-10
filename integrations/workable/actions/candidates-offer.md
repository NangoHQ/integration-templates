# Candidates Offer

## General Information
- **Description:** Fetches candidate's latest offer from workable

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: r_candidates
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/workable/syncs/candidates-offer.ts)

### Request Endpoint

- **Path:** `/workable/candidates-offer`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "candidate": {
    "id": "<string>",
    "name": "<string>"
  },
  "created_at": "<date>",
  "document_variables": "<array>",
  "documents": "<array>",
  "state": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/workable/syncs/candidates-offer.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/workable/syncs/candidates-offer.md)

<!-- END  GENERATED CONTENT -->

undefined