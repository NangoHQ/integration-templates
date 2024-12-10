# Contacts

## General Information
- **Description:** Fetches the list of contacts.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/freshdesk/syncs/contacts.ts)

### Request Endpoint

- **Path:** `/contacts`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

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


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/freshdesk/syncs/contacts.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/freshdesk/syncs/contacts.md)

<!-- END  GENERATED CONTENT -->

undefined