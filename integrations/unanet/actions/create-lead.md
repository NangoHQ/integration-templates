# Create Lead

## General Information

- **Description:** Create a lead with with information about the federal agency, the name, due date, posted date, solicitation number, naics category or categories, the city, state, country, and description.
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/unanet/actions/create-lead.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/leads`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "federalAgency": {
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
  "name": "<string>",
  "dueDate": "<string>",
  "postedDate": "<string>",
  "solicitationNumber": "<string>",
  "naicsCategory": [
    "<string | string>"
  ],
  "city": "<string>",
  "state": "<string>",
  "country": "<string>",
  "description": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "federalAgency": {
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
  "name": "<string>",
  "dueDate": "<string>",
  "postedDate": "<string>",
  "solicitationNumber": "<string>",
  "naicsCategory": [
    "<string | string>"
  ],
  "city": "<string>",
  "state": "<string>",
  "country": "<string>",
  "description": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/create-lead.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/create-lead.md)

<!-- END  GENERATED CONTENT -->
