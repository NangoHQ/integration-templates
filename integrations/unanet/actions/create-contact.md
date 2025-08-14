<!-- BEGIN GENERATED CONTENT -->
# Create Contact

## General Information

- **Description:** Create a contact in the system
- **Version:** 2.0.0
- **Group:** Contacts
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_unanet_createcontact`
- **Input Model:** `ActionInput_unanet_createcontact`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/unanet/actions/create-contact.ts)


## Endpoint Reference

### Request Endpoint

`POST /contacts`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id?": "<string>",
  "firstName": "<string>",
  "lastName": "<string>",
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
  "position": "<string>",
  "emailAddress": "<string>",
  "phone": "<string>",
  "fax": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/create-contact.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/create-contact.md)

<!-- END  GENERATED CONTENT -->

