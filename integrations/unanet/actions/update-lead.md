<!-- BEGIN GENERATED CONTENT -->
# Update Lead

## General Information

- **Description:** Update a lead with any changed information about the federal agency, the name, due date, posted date, solicitation number, naics category or categories, the city, state, country, and description.
- **Version:** 2.0.0
- **Group:** Leads
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_unanet_updatelead`
- **Input Model:** `ActionInput_unanet_updatelead`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/unanet/actions/update-lead.ts)


## Endpoint Reference

### Request Endpoint

`PUT /leads`

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
  "naicsCategory": "<<string> | <string[]>>",
  "city": "<string>",
  "state": "<string>",
  "country": "<string>",
  "description": "<string>",
  "id": "<string>"
}
```

### Request Response

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
  "naicsCategory": "<<string> | <string[]>>",
  "city": "<string>",
  "state": "<string>",
  "country": "<string>",
  "description": "<string>",
  "createdAt?": "<string>",
  "updatedAt?": "<string>",
  "id": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/update-lead.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/update-lead.md)

<!-- END  GENERATED CONTENT -->

