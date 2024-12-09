# Create User

## General Information

- **Description:** Creates a user in RingCentral
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: EditAccounts
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ring-central-sandbox/actions/create-user.ts)

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
  "active?": "<boolean>",
  "externalId?": "<string>",
  "phoneNumbers?": [
    {
      "type": "<work | mobile | other>",
      "value": "<string>"
    }
  ],
  "photos?": [
    {
      "type": "<photo>",
      "value": "<string>"
    }
  ],
  "addresses?": [
    {
      "type": "<work>",
      "streetAddress?": "<string>",
      "locality?": "<string>",
      "region?": "<string>",
      "postalCode?": "<string>",
      "country?": "<string>"
    }
  ],
  "title?": "<string>",
  "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User?": {
    "department": "<string>"
  }
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
