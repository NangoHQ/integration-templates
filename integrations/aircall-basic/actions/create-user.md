# Create User

## General Information

- **Description:** Creates a user in Aircall.
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/aircall-basic/actions/create-user.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /task
- **Method:** DELETE

### Request Query Parameters

n/a

### Request Body

```json
"firstName": "string",
"lastName": "string",
"email": "string"
```

### Request Response

```json
{
  "id": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string"
}
```

## Endpoint Setup Guide

Start with the [Hubspot Setup Guide](https://docs.nango.dev/integrations/all/hubspot#setup-guide) and Nango's [Getting Started](https://docs.nango.dev/guides/getting-started)

(Endpoint-specific instructions)

## Changelog

| Date | PR | Version | Message |
| - | - | - | - |
| December 5, 2024 | #3050 | 1.0.1 | Add `full_name` field to Contact model. |