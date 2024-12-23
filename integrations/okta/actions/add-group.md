<!-- BEGIN GENERATED CONTENT -->
# Add Group

## General Information

- **Description:** Adds a new group with the OKTA_GROUP type to your org
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `okta.groups.manage`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/okta/actions/add-group.ts)


## Endpoint Reference

### Request Endpoint

`POST /group`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "description?": "<string | undefined>",
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
  "objectClass": [
    "<string>"
  ],
  "type": "<APP_GROUP | BUILT_IN | OKTA_GROUP>",
  "profile": "<OktaUserGroupProfile | OktaActiveDirectoryGroupProfile>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/okta/actions/add-group.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/okta/actions/add-group.md)

<!-- END  GENERATED CONTENT -->

