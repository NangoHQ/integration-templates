# Create User

## General Information

- **Description:** Creates a user in Gusto.
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `employees:manage`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/gusto-demo/actions/create-user.ts)


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
  "email": "<string>",
  "middleInitial?": "<string>",
  "preferredFirstName?": "<string>",
  "dateOfBirth": "<string>",
  "ssn?": "<string>",
  "selfOnboarding?": "<boolean>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gusto-demo/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gusto-demo/actions/create-user.md)

<!-- END  GENERATED CONTENT -->

