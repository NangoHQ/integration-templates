<!-- BEGIN GENERATED CONTENT -->
# Create User

## General Information

- **Description:** Creates a user in Bill.
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_bill_createuser`
- **Input Model:** `ActionInput_bill_createuser`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/bill/actions/create-user.ts)


## Endpoint Reference

### Request Endpoint

`POST /users`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "firstName": "<string>",
  "lastName": "<string>",
  "email": "<string>",
  "roleId?": "<string>",
  "acceptTermsOfService?": "<boolean>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "firstName": "<string>",
  "lastName": "<string>",
  "email": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/bill/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/bill/actions/create-user.md)

<!-- END  GENERATED CONTENT -->

