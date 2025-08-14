<!-- BEGIN GENERATED CONTENT -->
# Get Schema

## General Information

- **Description:** Get the schema of any entity. Useful to know the properties of any object that exists in the system.
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_unanet_getschema`
- **Input Model:** `ActionInput_unanet_getschema`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/unanet/actions/get-schema.ts)


## Endpoint Reference

### Request Endpoint

`GET /schema`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "name": "<string>"
}
```

### Request Response

```json
{
  "0": {
    "PropertyName": "<string>",
    "Group": "<string | null>",
    "Label": "<string>",
    "Description": "<string | null>",
    "Enabled": "<boolean>",
    "ReadOnly": "<boolean>",
    "Required": "<boolean>",
    "DefaultValue": "<string | null>",
    "DataType": "<number>",
    "MaxLength": "<number | null>",
    "UnicodeSupported": "<boolean>",
    "Searchable": "<boolean>",
    "ArrayType": "<string | null>",
    "IsPrimaryKey": "<boolean>",
    "IsExternalId": "<boolean>",
    "ObjectEndpoint": "<string | null>",
    "IsHidden": "<boolean>",
    "IsIncludedInResponse": "<boolean>",
    "SchemaEndpoint": "<string | null>",
    "SortOrder": "<number>",
    "CustomSort": "<boolean>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/get-schema.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/unanet/actions/get-schema.md)

<!-- END  GENERATED CONTENT -->

