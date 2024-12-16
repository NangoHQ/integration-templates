<!-- BEGIN GENERATED CONTENT -->
# Get Leads

## General Information

- **Description:** Fetch all leads
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/unanet/actions/get-leads.ts)


## Endpoint Reference

### Request Endpoint

`GET /leads`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
[
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
]
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/get-leads.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/get-leads.md)

<!-- END  GENERATED CONTENT -->

