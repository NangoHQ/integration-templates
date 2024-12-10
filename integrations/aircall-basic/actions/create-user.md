# Create User

## General Information

- **Description:** Creates a user in Aircall.
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/aircall-basic/actions/create-user.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/users`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "firstName": "<string>",
  "lastName": "<string>",
  "email": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "email": "<string>",
  "firstName": "<string>",
  "lastName": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/aircall-basic/actions/create-user.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/aircall-basic/actions/create-user.md)

## Endpoint Setup Guide

Start with the [Hubspot Setup Guide](https://docs.nango.dev/integrations/all/hubspot#setup-guide) and Nango's [Getting Started](https://docs.nango.dev/guides/getting-started)

(Endpoint-specific instructions)
