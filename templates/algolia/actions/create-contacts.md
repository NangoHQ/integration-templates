<!-- BEGIN GENERATED CONTENT -->
# Create Contacts

## General Information

- **Description:** Action to add a single record contact to an index

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `AlgoliaContact`
- **Input Model:** `AlgoliaCreateContactInput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/algolia/actions/create-contacts.ts)


## Endpoint Reference

### Request Endpoint

`POST /contacts`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "name": "<string>",
  "company": "<string>",
  "email": "<string>"
}
```

### Request Response

```json
{
  "createdAt": "<date>",
  "taskID": "<number>",
  "objectID": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/algolia/actions/create-contacts.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/algolia/actions/create-contacts.md)

<!-- END  GENERATED CONTENT -->

