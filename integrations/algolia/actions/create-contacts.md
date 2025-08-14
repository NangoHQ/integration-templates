<!-- BEGIN GENERATED CONTENT -->
# Create Contacts

## General Information

- **Description:** Action to add a single record contact to an index
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_algolia_createcontacts`
- **Input Model:** `ActionInput_algolia_createcontacts`
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
  "createdAt": "<Date>",
  "taskID": "<number>",
  "objectID": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/algolia/actions/create-contacts.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/algolia/actions/create-contacts.md)

<!-- END  GENERATED CONTENT -->

