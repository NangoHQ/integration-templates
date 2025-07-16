import type { HibobEmployee } from ../models.js;
import type { HibobEmployeeResponse } from '../types.js';

/**
 * Maps raw HiBob employee data to our standardized HibobEmployee model
 * @param employees - Array of raw employee data from HiBob API
 * @returns Array of mapped HibobEmployee objects
 */
export function toHibobEmployee(employees: HibobEmployeeResponse[]): HibobEmployee[] {
    return employees.map((employee) => ({
        id: employee.id,
        firstName: employee.firstName,
        surname: employee.surname,
        email: employee.email,
        displayName: employee.displayName,
        personal: employee.personal,
        about: employee.about,
        work: employee.work
    }));
}
