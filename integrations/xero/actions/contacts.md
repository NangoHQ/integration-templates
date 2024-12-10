# Contacts

## General Information
- **Description:** Fetches all Xero contacts.
Details: incremental sync, detects deletes, metadata is not required.

- **Version:** 1.0.2
- **Group:** Others
- **Scopes:**: accounting.contacts
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/syncs/contacts.ts)

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
  "name": "<string>",
  "id": "<string>",
  "external_id": "<string | null>",
  "email": "<string | null>",
  "tax_number": "<string | null>",
  "address_line_1?": "<string | null>",
  "address_line_2?": "<string | null>",
  "city": "<string | null>",
  "zip": "<string | null>",
  "country": "<string | null>",
  "state": "<string | null>",
  "phone": "<string | null>",
  "subsidiary?": "<string | null>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/syncs/contacts.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/syncs/contacts.md)

<!-- END  GENERATED CONTENT -->

undefined