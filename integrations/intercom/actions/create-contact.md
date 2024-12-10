# Create Contact

## General Information

- **Description:** Creates a contact in Intercom
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/intercom/actions/create-contact.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/contact`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "__extends": {
    "firstName": "<string>",
    "lastName": "<string>",
    "email": "<string>"
  },
  "external_id?": "<string>",
  "phone?": "<string>",
  "avatar?": "<string>",
  "signed_up_at?": "<number>",
  "last_seen_at?": "<number>",
  "owner_id?": "<string>",
  "unsubscribed_from_emails?": "<boolean>"
}
```

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/intercom/actions/create-contact.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/intercom/actions/create-contact.md)
