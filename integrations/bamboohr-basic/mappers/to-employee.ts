import type { BamboohrEmployee } from '../models.js';
import type { BamboohrEmployeeResponse } from '../types.js';

/**
 * Maps raw BambooHR employee data to our standardized BamboohrEmployee model
 */
export function toEmployee(employees: BamboohrEmployeeResponse['employees']): BamboohrEmployee[] {
    return employees.map((employee) => ({
        id: employee.employeeNumber || '',
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        dateOfBirth: employee.dateOfBirth,
        addressLineOne: employee.addressLineOne,
        email: employee.email,
        jobInformationJobTitle: employee.jobInformationJobTitle,
        hireDate: employee.hireDate,
        supervisorId: employee.supervisorId,
        supervisorName: employee.supervisorName,
        createdByUserId: employee.createdByUserId,
        jobInformationDepartment: employee.jobInformationDepartment,
        jobInformationDivision: employee.jobInformationDivision,
        employmentStatus: employee.employmentStatus,
        gender: employee.gender,
        country: employee.country,
        city: employee.city,
        jobInformationLocation: employee.jobInformationLocation,
        state: employee.state,
        maritalStatus: employee.maritalStatus,
        payBand: employee.payBand,
        compensationPayType: employee.compensationPayType,
        compensationPaySchedule: employee.compensationPaySchedule,
        workPhone: employee.workPhone,
        homePhone: employee.homePhone
    }));
}
