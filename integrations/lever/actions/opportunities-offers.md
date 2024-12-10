# Opportunities Offers

## General Information
- **Description:** Fetches a list of all offers for every single opportunity

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: offers:write:admin
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever-sandbox/syncs/opportunities-offers.ts)

### Request Endpoint

- **Path:** `/offers`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "createdAt": "<number>",
  "status": "<string>",
  "creator": "<string>",
  "fields": [
    "<string>"
  ],
  "sentDocument": {
    "fileName": "<string>",
    "uploadedAt": "<number>",
    "downloadUrl": "<string>"
  },
  "signedDocument": {
    "fileName": "<string>",
    "uploadedAt": "<number>",
    "downloadUrl": "<string>"
  }
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/syncs/opportunities-offers.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever-sandbox/syncs/opportunities-offers.md)

<!-- END  GENERATED CONTENT -->







undefined