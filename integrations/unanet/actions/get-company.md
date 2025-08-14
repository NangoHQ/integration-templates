<!-- BEGIN GENERATED CONTENT -->
# Get Company

## General Information

- **Description:** Retrieve information about a company
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_unanet_getcompany`
- **Input Model:** `ActionInput_unanet_getcompany`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/unanet/actions/get-company.ts)


## Endpoint Reference

### Request Endpoint

`GET /company`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "name": "<string>"
}
```

### Request Response

```json
{
  "0": {
    "name": "<string>",
    "externalId": "<string>",
    "federalAgency?": {
      "city?": "<string>",
      "state?": "<string>",
      "country?": "<string>",
      "zip?": "<string>",
      "companyId?": "<number>",
      "name": "<string>",
      "externalId?": "<string>",
      "acronym?": "<string>",
      "address1?": "<string>",
      "address2?": "<string>",
      "address3?": "<string>",
      "isHeadquarters?": "<boolean>",
      "parentCompanyId?": "<number>",
      "parentCompanyName?": "<string>",
      "childCount?": "<number>",
      "addrLat?": "<number>",
      "addrLong?": "<number>"
    },
    "shortName": "<string>",
    "description": "<string>",
    "id?": "<string>"
  },
  "1": "<null>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/get-company.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/get-company.md)

<!-- END  GENERATED CONTENT -->

