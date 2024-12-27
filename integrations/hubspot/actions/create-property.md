<!-- BEGIN GENERATED CONTENT -->
# Create Property

## General Information

- **Description:** Create a property in Hubspot
- **Version:** 0.0.1
- **Group:** Properties
- **Scopes:** `oauth, crm.schemas.orders.write, crm.objects.orders.write, crm.schemas.contacts.write, crm.schemas.carts.write, crm.schemas.deals.write, crm.objects.users.write, crm.schemas.companies.write, crm.objects.carts.write`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/create-property.ts)


## Endpoint Reference

### Request Endpoint

`POST /properties`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "objectType": "<string>",
  "data": {
    "hidden?": "<boolean>",
    "displayOrder?": "<number>",
    "description?": "<string>",
    "label": "<string>",
    "type": "<string>",
    "formField?": "<boolean>",
    "groupName": "<string>",
    "referencedObjectType?": "<string>",
    "name": "<string>",
    "options?": [
      {
        "hidden": "<boolean>",
        "displayOrder?": "<number>",
        "description?": "<string>",
        "label": "<string>",
        "value": "<string>"
      }
    ],
    "calculationFormula?": "<string>",
    "hasUniqueValue?": "<boolean>",
    "fieldType": "<string>",
    "externalOptions?": "<boolean>"
  }
}
```

### Request Response

```json
{
  "createdUserId": "<string>",
  "hidden": "<boolean>",
  "modificationMetadata": {
    "readOnlyOptions?": "<boolean>",
    "readOnlyValue": "<boolean>",
    "readOnlyDefinition": "<boolean>",
    "archivable": "<boolean>"
  },
  "displayOrder": "<number>",
  "description": "<string>",
  "showCurrencySymbol?": "<boolean>",
  "label": "<string>",
  "type": "<string>",
  "hubspotDefined?": "<boolean>",
  "formField": "<boolean>",
  "dataSensitivity?": "<string>",
  "createdAt": "<string>",
  "archivedAt?": "<string>",
  "archived": "<boolean>",
  "groupName": "<string>",
  "referencedObjectType?": "<string>",
  "name": "<string>",
  "options": {
    "0": {
      "hidden": "<boolean>",
      "displayOrder": "<number>",
      "description": "<string>",
      "label": "<string>",
      "value": "<string>"
    }
  },
  "calculationFormula?": "<string>",
  "hasUniqueValue": "<boolean>",
  "fieldType": "<string>",
  "updatedUserId": "<string>",
  "calculated": "<boolean>",
  "externalOptions": "<boolean>",
  "updatedAt": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/create-property.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/create-property.md)

<!-- END  GENERATED CONTENT -->

