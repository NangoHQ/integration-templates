<!-- BEGIN GENERATED CONTENT -->
# Get Company Info

## General Information

- **Description:** Retrieves information about the current RingCentral account/company.
- **Version:** 1.0.0
- **Group:** Company
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_ring_central_getcompanyinfo`
- **Input Model:** `ActionInput_ring_central_getcompanyinfo`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ring-central/actions/get-company-info.ts)


## Endpoint Reference

### Request Endpoint

`GET /account/current`

### Request Query Parameters

_No request parameters_

### Request Body

```json
"<null>"
```

### Request Response

```json
{
  "id": "<string>",
  "name": "<string>",
  "status": "<string>",
  "serviceInfo": {
    "brand": {
      "id": "<string>",
      "name": "<string>"
    },
    "servicePlan": {
      "id": "<string>",
      "name": "<string>"
    }
  },
  "mainNumber?": "<string>",
  "operator": {
    "id?": "<string>",
    "extensionNumber?": "<string>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ring-central/actions/get-company-info.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ring-central/actions/get-company-info.md)

<!-- END  GENERATED CONTENT -->

