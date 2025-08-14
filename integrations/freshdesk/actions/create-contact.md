<!-- BEGIN GENERATED CONTENT -->
# Create Contact

## General Information

- **Description:** Creates a user in FreshDesk
- **Version:** 2.0.0
- **Group:** Contacts
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_freshdesk_createcontact`
- **Input Model:** `ActionInput_freshdesk_createcontact`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/freshdesk/actions/create-contact.ts)


## Endpoint Reference

### Request Endpoint

`POST /contacts`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "name": "<string>",
  "email?": "<string>",
  "phone?": "<string>",
  "mobile?": "<string>",
  "twitter_id?": {
    "type": "<string>",
    "unique?": "<unknown>",
    "required?": "<unknown>"
  },
  "unique_external_id?": {
    "type": "<string>",
    "unique?": "<unknown>",
    "required?": "<unknown>"
  },
  "other_emails?": "<unknown[]>",
  "company_id?": "<number>",
  "view_all_tickets?": "<boolean>",
  "other_companies?": "<unknown[]>",
  "address?": "<string>",
  "avatar?": {},
  "custom_fields?": {},
  "description?": "<string>",
  "job_title?": "<string>",
  "language?": "<string>",
  "tags?": "<unknown[]>",
  "time_zone?": "<string>",
  "lookup_parameter?": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "active": "<boolean>",
  "email": "<string>",
  "name": "<string>",
  "createdAt": "<string>",
  "updatedAt": "<string>",
  "companyId?": "<string>",
  "phone?": "<string | null>",
  "mobile?": "<string | null>",
  "jobTitle?": "<string | null>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/freshdesk/actions/create-contact.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/freshdesk/actions/create-contact.md)

<!-- END  GENERATED CONTENT -->

