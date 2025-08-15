<!-- BEGIN GENERATED CONTENT -->
# Get Leads

## General Information

- **Description:** Fetch all leads
- **Version:** 1.0.0
- **Group:** Leads
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_unanet_getleads`
- **Input Model:** `ActionInput_unanet_getleads`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/unanet/actions/get-leads.ts)


## Endpoint Reference

### Request Endpoint

`GET /leads`

### Request Query Parameters

_No request parameters_

### Request Body

```json
"<null>"
```

### Request Response

```json
{
  "0": {
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
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/get-leads.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/get-leads.md)

<!-- END  GENERATED CONTENT -->

