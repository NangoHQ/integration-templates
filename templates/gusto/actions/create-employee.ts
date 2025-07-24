import { createAction } from "nango";
import { GustoCreateEmployeeSchema } from '../schema.js';
import type { GustoCreateEmployeeRequest } from '../types.js';

import type { ProxyConfiguration } from "nango";
import type { GustoEmployee } from "../models.js";
import { GustoCreateEmployeeResponse, GustoCreateEmployee } from "../models.js";

const action = createAction({
    description: "Creates an employee in Gusto.",
    version: "0.0.1",

    endpoint: {
        method: "POST",
        path: "/employees",
        group: "Employees"
    },

    input: GustoCreateEmployee,
    output: GustoCreateEmployeeResponse,
    scopes: ["employees:manage"],

    exec: async (nango, input): Promise<GustoCreateEmployeeResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: GustoCreateEmployeeSchema, input });

        const connection = await nango.getConnection();

        const companyUuid = connection.connection_config['companyUuid'];

        if (!companyUuid) {
            throw new nango.ActionError({
                message: 'Company UUID is missing from the connection configuration'
            });
        }

        const gustoInput: GustoCreateEmployeeRequest = {
            first_name: parsedInput.data.firstName,
            last_name: parsedInput.data.lastName,
            email: parsedInput.data.email
        };

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

        if (parsedInput.data.selfOnboarding) {
            gustoInput.self_onboarding = parsedInput.data.selfOnboarding;
        }

        const config: ProxyConfiguration = {
            // https://docs.gusto.com/embedded-payroll/reference/post-v1-employees
            endpoint: `/v1/companies/${companyUuid}/employees`,
            data: gustoInput,
            retries: 3
        };

        const response = await nango.post<GustoEmployee>(config);
        const { data } = response;

        const createEmployeeResponse: GustoCreateEmployeeResponse = {
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
