# Locations

## General Information
- **Description:** Fetches all locations in Netsuite

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/netsuite-tba/syncs/locations.ts)

### Request Endpoint

- **Path:** `/locations`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "isInactive": "<boolean>",
  "name": "<string>",
  "lastModifiedDate": "<string>",
  "address": {
    "address1": "<string>",
    "addressee": "<string>",
    "addressText": "<string>",
    "city": "<string>",
    "country": "<string>",
    "state": "<string>",
    "zip": "<string>"
  },
  "returnAddress": {
    "addressText": "<string>",
    "country": "<string>"
  },
  "timeZone": "<string>",
  "useBins": "<boolean>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/syncs/locations.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/syncs/locations.md)

<!-- END  GENERATED CONTENT -->

undefined