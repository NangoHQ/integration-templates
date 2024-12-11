# Create Opportunity

## General Information

- **Description:** Create an opportunity in the system. Requires a stage that exists
in the system. Use the list-stages action to find the appropriate stage.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/unanet/actions/create-opportunity.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/opportunity`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "city?": "<string>",
  "state?": "<string>",
  "country?": "<string>",
  "zip?": "<string>",
  "name": "<string>",
  "description": "<string>",
  "id?": "<string>",
  "externalId": "<string>",
  "dueDate": "<string>",
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
  "stage": "<string>",
  "active": "<boolean>"
}
```

### Request Response

```json
{
  "city?": "<string>",
  "state?": "<string>",
  "country?": "<string>",
  "zip?": "<string>",
  "name": "<string>",
  "description": "<string>",
  "id?": "<string>",
  "externalId": "<string>",
  "dueDate": "<string>",
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
  "stage": "<string>",
  "active": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/create-opportunity.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/create-opportunity.md)

<!-- END  GENERATED CONTENT -->

