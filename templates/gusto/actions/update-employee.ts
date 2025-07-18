import { createAction } from "nango";
import { GustoUpdateEmployeeSchema } from '../schema.js';
import type { GustoUpdateEmployeeRequest } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { GustoUpdateEmployeeResponse, GustoUpdateEmployee, GustoEmployee } from "../models.js";

const action = createAction({
    description: "Updates an employee in Gusto.",
    version: "0.0.1",

    endpoint: {
        method: "PUT",
        path: "/employees",
        group: "Employees"
    },

    input: GustoUpdateEmployee,
    output: GustoUpdateEmployeeResponse,
    scopes: ["employees:manage"],

    exec: async (nango, input): Promise<GustoUpdateEmployeeResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: GustoUpdateEmployeeSchema, input });

        const employeeId = parsedInput.data.id;

        const gustoInput: GustoUpdateEmployeeRequest = {
            version: parsedInput.data.version
        };

        if (parsedInput.data.firstName) {
            gustoInput.first_name = parsedInput.data.firstName;
        }

        if (parsedInput.data.lastName) {
            gustoInput.last_name = parsedInput.data.lastName;
        }

        if (parsedInput.data.email) {
            gustoInput.email = parsedInput.data.email;
        }

        if (parsedInput.data.dateOfBirth) {
            gustoInput.date_of_birth = parsedInput.data.dateOfBirth;
        }

        if (parsedInput.data.middleInitial) {
            gustoInput.middle_initial = parsedInput.data.middleInitial;
        }

        if (parsedInput.data.preferredFirstName) {
            gustoInput.preferred_first_name = parsedInput.data.preferredFirstName;
        }

        if (parsedInput.data.ssn) {
            gustoInput.ssn = parsedInput.data.ssn;
        }

        if (parsedInput.data.twoPercentShareholder) {
            gustoInput.two_percent_shareholder = parsedInput.data.twoPercentShareholder;
        }

        const config: ProxyConfiguration = {
            // https://docs.gusto.com/embedded-payroll/reference/post-v1-employees
            endpoint: `/v1/employees/${employeeId}`,
            data: gustoInput,
            retries: 3
        };

        const response = await nango.put<GustoEmployee>(config);
        const { data } = response;

        const createEmployeeResponse: GustoUpdateEmployeeResponse = {
            id: data.uuid,
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email
        };

        return createEmployeeResponse;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
