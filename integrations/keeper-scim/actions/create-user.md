# Create User

## General Information

- **Description:** Creates a user in Keeper
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/keeper-scim/actions/create-user.ts)


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
      "type": "<photo | thumbnail>",
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
  "title?": "<string>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/keeper-scim/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/keeper-scim/actions/create-user.md)

<!-- END  GENERATED CONTENT -->

