import type { BamboohrEmployee } from '../models.js';
import type { BamboohrEmployeeResponse } from '../types.js';

/**
 * Maps raw BambooHR employee data to our standardized BamboohrEmployee model
 */
export function toEmployee(employees: BamboohrEmployeeResponse['employees']): BamboohrEmployee[] {
    return employees.map((employee) => ({
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        dateOfBirth: employee.dateOfBirth,
        address1: employee.address1,
        bestEmail: employee.bestEmail,
        jobTitle: employee.jobTitle,
        hireDate: employee.hireDate,
        supervisorId: employee.supervisorId,
        supervisor: employee.supervisor,
        createdByUserId: employee.createdByUserId,
        department: employee.department,
        division: employee.division,
        employmentHistoryStatus: employee.employmentHistoryStatus,
        gender: employee.gender,
        country: employee.country,
        city: employee.city,
        location: employee.location,
        state: employee.state,
        maritalStatus: employee.maritalStatus,
        exempt: employee.exempt,
        payRate: employee.payRate,
        payType: employee.payType,
        payPer: employee.payPer,
        ssn: employee.ssn,
        workEmail: employee.workEmail,
        workPhone: employee.workPhone,
        homePhone: employee.homePhone
    }));
}
