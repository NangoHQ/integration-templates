<!-- BEGIN GENERATED CONTENT -->
# Create User

## General Information

- **Description:** Creates a user in RingCentral
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `EditAccounts`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ring-central/actions/create-user.ts)


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

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ring-central/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ring-central/actions/create-user.md)

<!-- END  GENERATED CONTENT -->

