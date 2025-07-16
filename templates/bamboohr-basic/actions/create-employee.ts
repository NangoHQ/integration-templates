import { createAction } from "nango";
import { BamboohrCreateEmployeeResponse, BamboohrCreateEmployee } from "../models.js";

const action = createAction({
    description: "Action to create a new employee",
    version: "1.0.1",

    endpoint: {
        method: "POST",
        path: "/employees",
        group: "Employees"
    },

    input: BamboohrCreateEmployee,
    output: BamboohrCreateEmployeeResponse,

    exec: async (nango, input): Promise<BamboohrCreateEmployeeResponse> => {
        // Input validation on only required fields
        if (!input.firstName && !input.lastName) {
            throw new nango.ActionError({
                message: 'firstName and lastName are required fields'
            });
        } else if (!input.firstName) {
            throw new nango.ActionError({
                message: 'firstName is a required field'
            });
        } else if (!input.lastName) {
            throw new nango.ActionError({
                message: 'lastName is a required field'
            });
        }

        // @allowTryCatch
        try {
            const { firstName, lastName, ...rest } = input;
            const postData = {
                firstName,
                lastName,
                ...rest
            };

            const response = await nango.post({
                endpoint: `/v1/employees`,
                data: postData,
                retries: 3
            });

            const location = response.headers['location'];
            if (!location) {
                throw new Error('missing location header');
            }

            const id = location.split('/').pop() || '';

            return {
                id,
                status: response.statusText
            };
        } catch (error: any) {
            const messageHeader = error.response?.headers['x-bamboohr-error-message'];
            const errorMessage = messageHeader || error.response?.data || error.message;

            throw new nango.ActionError({
                message: `Failed to create employee`,
                status: error.response.status,
                error: errorMessage || undefined
            });
        }
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
