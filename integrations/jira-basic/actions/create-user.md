# Create User

## General Information

- **Description:** Creates a user in Jira. Note that this endpoint is marked as experimental and could 
be deprecated in the future. Products are optional and allowed params are
jira-core, jira-servicedesk, jira-product-discovery, jira-software. Defaults to 
jira-software. Note that the last name isn't able to be set via the API and 
the first name defaults to the email address.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/jira-basic/actions/create-user.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /users
- **Method:** POST

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
