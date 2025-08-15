<!-- BEGIN GENERATED CONTENT -->
# Create Database Row

## General Information

- **Description:** Create a new row in a specified Notion database. 
The properties are mapped to Notion-compatible formats based on the database schema. 
Supported property types include:
- `title` (string): Creates a title property.
- `select` (string): Creates a select property.
- `multi_select` (array of strings): Creates a multi-select property.
- `status` (string): Creates a status property.
- `date` (string or object): Supports ISO date strings or objects with a `start` field.
- `checkbox` (boolean): Creates a checkbox property.
- `number` (number): Creates a number property.
- `url` (string): Creates a URL property.
- `email` (string): Creates an email property.
- `phone_number` (string): Creates a phone number property.
- `rich_text` (string): Creates a rich text property.
- `relation` (array of IDs): Creates a relation property.
- **Version:** 2.0.0
- **Group:** Databases
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_notion_createdatabaserow`
- **Input Model:** `ActionInput_notion_createdatabaserow`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/notion/actions/create-database-row.ts)


## Endpoint Reference

### Request Endpoint

`POST /databases/row`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "databaseId": "<string>",
  "properties": {}
}
```

### Request Response

```json
{
  "success": "<boolean>",
  "addedProperties": [
    {
      "propertyKey": "<string>",
      "notionValue?": "<unknown>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/notion/actions/create-database-row.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/notion/actions/create-database-row.md)

<!-- END  GENERATED CONTENT -->
### Steps to Use
1. **Find the `databaseId`**:
   - Use the `databases` sync (refer to the implementation [here](https://github.com/NangoHQ/integration-templates/blob/main/integrations/notion/syncs/databases.ts)) to retrieve a list of databases and their respective IDs.
2. **Provide `properties`**:
   - The `properties` input is a key-value pair where the key is the name of the database column, and the value is the data you want to populate in that column.
3. **Dynamic Mapping**:
   - This action dynamically formulates the data to match the database schema in Notion.
