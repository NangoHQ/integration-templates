<!-- BEGIN GENERATED CONTENT -->
# Create Company

## General Information

- **Description:** Create a company in the system
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/unanet/actions/create-company.ts)


## Endpoint Reference

### Request Endpoint

`POST /company`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "name": "<string>",
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
  }
}
```

### Request Response

```json
{
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
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/create-company.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/create-company.md)

<!-- END  GENERATED CONTENT -->

