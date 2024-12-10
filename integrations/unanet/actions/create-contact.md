# Create Contact

## General Information

- **Description:** Create a contact in the system
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/unanet/actions/create-contact.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/contacts`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id?": "<string>",
  "firstName": "<string>",
  "lastName": "<string>",
  "federalAgency": {
    "__extends": {
      "city?": "<string>",
      "state?": "<string>",
      "country?": "<string>",
      "zip?": "<string>"
    },
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
  "position": "<string>",
  "emailAddress": "<string>",
  "phone": "<string>",
  "fax": "<string>"
}
```

### Request Response

```json
{
  "id?": "<string>",
  "firstName": "<string>",
  "lastName": "<string>",
  "federalAgency": {
    "__extends": {
      "city?": "<string>",
      "state?": "<string>",
      "country?": "<string>",
      "zip?": "<string>"
    },
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
  "position": "<string>",
  "emailAddress": "<string>",
  "phone": "<string>",
  "fax": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/create-contact.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/create-contact.md)
