<!-- BEGIN GENERATED CONTENT -->
# Employees

## General Information

- **Description:** Fetch all employees from Oracle HCM in the native Oracle data model
- **Version:** 0.0.1
- **Group:** Oracle HCM API
- **Scopes:** _None_
- **Endpoint Type:** Sync
- **Model:** `Employee`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/oracle-hcm/syncs/employees.ts)


## Endpoint Reference

### Request Endpoint

`GET /employees`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.
- **ids:** `(optional, string[])` An array of string containing a list of your records IDs. The list will be filtered to include only the records with a matching ID.

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "personNumber": "<string | undefined>",
  "displayName?": "<string>",
  "firstName?": "<string | undefined>",
  "lastName?": "<string | undefined>",
  "workEmail?": "<string | undefined>",
  "title?": "<string | undefined>",
  "departmentId?": "<string | undefined>",
  "departmentName?": "<string | undefined>",
  "assignmentStatusType?": "<string | undefined>",
  "startDate?": "<string | undefined>",
  "terminationDate?": "<string | undefined>",
  "managerId?": "<string | undefined>",
  "managerName?": "<string | undefined>",
  "workLocationName?": "<string | undefined>",
  "workLocationType?": "<string | undefined>",
  "correspondenceLanguage?": "<string | undefined | null>",
  "bloodType?": "<string | undefined | null>",
  "dateOfBirth?": "<string | undefined | null>",
  "dateOfDeath?": "<string | undefined | null>",
  "countryOfBirth?": "<string | undefined | null>",
  "regionOfBirth?": "<string | undefined | null>",
  "townOfBirth?": "<string | undefined | null>",
  "applicantNumber?": "<string | undefined | null>",
  "createdBy?": "<string | undefined>",
  "lastUpdatedBy?": "<string | undefined>",
  "creationDate?": "<string | undefined>",
  "lastUpdateDate?": "<string | undefined>",
  "workLocationAddress?": "<OracleHcmAddress | undefined>",
  "addresses?": "<OracleHcmAddress[] | undefined>",
  "phones?": "<OracleHcmPhone[] | undefined>",
  "emails?": "<OracleHcmEmail[] | undefined>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/oracle-hcm/syncs/employees.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/oracle-hcm/syncs/employees.md)

<!-- END  GENERATED CONTENT -->

