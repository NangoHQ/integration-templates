<!-- BEGIN GENERATED CONTENT -->
# Create Employee

## General Information

- **Description:** Action to create a new employee

- **Version:** 1.0.1
- **Group:** Employees
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `BamboohrCreateEmployeeResponse`
- **Input Model:** `BamboohrCreateEmployee`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/bamboohr-basic/actions/create-employee.ts)


## Endpoint Reference

### Request Endpoint

`POST /employees`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "firstName": "<string>",
  "lastName": "<string>",
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
  "status": "<string>",
  "id": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/bamboohr-basic/actions/create-employee.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/bamboohr-basic/actions/create-employee.md)

<!-- END  GENERATED CONTENT -->

