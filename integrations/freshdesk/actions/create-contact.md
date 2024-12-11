# Create Contact

## General Information

- **Description:** Creates a user in FreshDesk
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Action
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
    "unique": true,
    "required": true
  },
  "unique_external_id?": {
    "type": "<string>",
    "unique": true,
    "required": true
  },
  "other_emails?": "<array>",
  "company_id?": "<number>",
  "view_all_tickets?": "<boolean>",
  "other_companies?": "<array>",
  "address?": "<string>",
  "avatar?": "<object>",
  "custom_fields?": "<object>",
  "description?": "<string>",
  "job_title?": "<string>",
  "language?": "<string>",
  "tags?": "<array>",
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
  "companyId?": "<string | undefined>",
  "phone?": "<string | undefined | null>",
  "mobile?": "<string | undefined | null>",
  "jobTitle?": "<string | undefined | null>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/freshdesk/actions/create-contact.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/freshdesk/actions/create-contact.md)

<!-- END  GENERATED CONTENT -->

