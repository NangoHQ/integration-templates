<!-- BEGIN GENERATED CONTENT -->
# Create User

## General Information

- **Description:** Creates a user in Keeper
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_keeper_scim_createuser`
- **Input Model:** `ActionInput_keeper_scim_createuser`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/keeper-scim/actions/create-user.ts)


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
  "phoneNumbers": [
    {
      "type": "<enum: 'work' | 'mobile' | 'other'>",
      "value": "<string>"
    }
  ],
  "photos": [
    {
      "type": "<enum: 'photo' | 'thumbnail'>",
      "value": "<string>"
    }
  ],
  "addresses": [
    {
      "type": "<string>",
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

