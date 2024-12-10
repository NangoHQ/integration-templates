# Contacts

## General Information
- **Description:** Fetches a list of contacts from Intercom

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/intercom/syncs/contacts.ts)

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
  "workspace_id": "<string>",
  "external_id": "<string | null>",
  "type": "<string>",
  "email": "<string>",
  "phone": "<string | null>",
  "name": "<string | null>",
  "created_at": "<string>",
  "updated_at": "<string>",
  "last_seen_at": "<string | null>",
  "last_replied_at": "<string | null>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/intercom/syncs/contacts.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/intercom/syncs/contacts.md)

<!-- END  GENERATED CONTENT -->

undefined