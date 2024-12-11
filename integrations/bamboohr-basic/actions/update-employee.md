<!-- BEGIN GENERATED CONTENT -->
# Update Employee

## General Information

- **Description:** Update an existing employee in the system
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/bamboohr-basic/actions/update-employee.ts)


## Endpoint Reference

### Request Endpoint

`PUT /employees`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "firstName?": "<string>",
  "lastName?": "<string>",
  "employeeNumber?": "<string>",
  "dateOfBirth?": "<string>",
  "address1?": "<string>",
  "bestEmail?": "<string>",
  "workEmail?": "<string>",
  "jobTitle?": "<string>",
  "hireDate?": "<string>",
  "supervisorId?": "<string>",
  "supervisor?": "<string>",
  "createdByUserId?": "<string>",
  "department?": "<string>",
  "division?": "<string>",
  "employmentHistoryStatus?": "<string>",
  "gender?": "<string>",
  "country?": "<string>",
  "city?": "<string>",
  "location?": "<string>",
  "state?": "<string>",
  "maritalStatus?": "<string>",
  "exempt?": "<string>",
  "payRate?": "<string>",
  "payType?": "<string>",
  "payPer?": "<string>",
  "ssn?": "<string>",
  "workPhone?": "<string>",
  "homePhone?": "<string>"
}
```

### Request Response

```json
{
  "status": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/bamboohr-basic/actions/update-employee.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/bamboohr-basic/actions/update-employee.md)

<!-- END  GENERATED CONTENT -->

