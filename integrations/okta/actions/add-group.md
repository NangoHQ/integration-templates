<!-- BEGIN GENERATED CONTENT -->
# Add Group

## General Information

- **Description:** Adds a new group with the OKTA_GROUP type to your org
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `okta.groups.manage`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_okta_addgroup`
- **Input Model:** `ActionInput_okta_addgroup`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/okta/actions/add-group.ts)


## Endpoint Reference

### Request Endpoint

`POST /group`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "description?": "<string>",
  "name": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "created": "<string>",
  "lastMembershipUpdated": "<string>",
  "lastUpdated": "<string>",
  "objectClass": "<string[]>",
  "type": "<enum: 'APP_GROUP' | 'BUILT_IN' | 'OKTA_GROUP'>",
  "profile": "<{\"description\":\"<string | null>\",\"name\":\"<string>\"} | {\"description\":\"<string>\",\"dn\":\"<string>\",\"externalId\":\"<string>\",\"name\":\"<string>\",\"samAccountName\":\"<string>\",\"windowsDomainQualifiedName\":\"<string>\"}>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/okta/actions/add-group.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/okta/actions/add-group.md)

<!-- END  GENERATED CONTENT -->

