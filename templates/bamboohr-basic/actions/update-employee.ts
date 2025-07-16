import { createAction } from "nango";
import { BamboohrResponseStatus, BamboohrUpdateEmployee } from "../models.js";

const action = createAction({
    description: "Update an existing employee in the system",
    version: "1.0.0",

    endpoint: {
        method: "PUT",
        path: "/employees",
        group: "Employees"
    },

    input: BamboohrUpdateEmployee,
    output: BamboohrResponseStatus,

    exec: async (nango, input): Promise<BamboohrResponseStatus> => {
        if (!input.id) {
            throw new nango.ActionError({
                message: 'id is a required field'
            });
        }

        // @allowTryCatch
        try {
            const { id, ...postData } = input;

            const response = await nango.post({
                endpoint: `/v1/employees/${input.id}`,
                data: postData,
                retries: 3
            });

            return {
                status: response.statusText
            };
        } catch (error: any) {
            const messageHeader = error.response?.headers['x-bamboohr-error-message'];
            const errorMessage = messageHeader || error.response?.data || error.message;

            throw new nango.ActionError({
                message: `Failed to update employee`,
                status: error.response.status,
                error: errorMessage || undefined
            });
        }
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
