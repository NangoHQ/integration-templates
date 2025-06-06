<!-- BEGIN GENERATED CONTENT -->
# Create User

## General Information

- **Description:** Creates a user in Jira. Note that this endpoint is marked as experimental and could 
be deprecated in the future. Products are optional and allowed params are
jira-core, jira-servicedesk, jira-product-discovery, jira-software. Defaults to 
jira-software. Note that the last name isn't able to be set via the API and 
the first name defaults to the email address.

- **Version:** 0.0.1
- **Group:** Users
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `User`
- **Input Model:** `JiraCreateUser`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/jira-basic/actions/create-user.ts)


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
  "products?": [
    "<string>"
  ]
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/jira-basic/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/jira-basic/actions/create-user.md)

<!-- END  GENERATED CONTENT -->

