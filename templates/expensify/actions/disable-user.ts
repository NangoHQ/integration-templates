import { createAction } from "nango";
import { getAdminPolicy } from '../helpers/policies.js';
import { getCredentials } from '../helpers/credentials.js';
import { expensifyDisableUserSchema } from '../schema.zod.js';

import { SuccessResponse, ExpensifyDisableUser } from "../models.js";

const action = createAction({
    description: "Disables a user in Expensify",
    version: "1.0.0",

    endpoint: {
        method: "DELETE",
        path: "/users",
        group: "Users"
    },

    input: ExpensifyDisableUser,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        await nango.zodValidateInput({ zodSchema: expensifyDisableUserSchema, input });

        const credentials = await getCredentials(nango);

        const defaultPolicy = await getAdminPolicy(nango);

        const { id: defaultPolicyId } = defaultPolicy;

        await nango.log(`Default policy found: ${defaultPolicyId}`);

        const boundary = '----WebKitFormBoundary' + Math.random().toString(16);
        const body = [
            `--${boundary}`,
            `Content-Disposition: form-data; name="requestJobDescription"`,
            '',
            JSON.stringify({
                type: 'update',
                dataSource: 'request',
                credentials,
                inputSettings: {
                    type: 'employees',
                    entity: 'generic'
                }
            }),
            `--${boundary}`,
            `Content-Disposition: form-data; name="data"`,
            '',
            JSON.stringify([
                {
                    isTerminated: true,
                    employeeEmail: input.email,
                    policyID: defaultPolicyId,
                    employeeID: input.id
                }
            ]),
            `--${boundary}--`
        ].join('\r\n');

        const response = await nango.post({
            // https://integrations.expensify.com/Integration-Server/doc/employeeUpdater/
            endpoint: `/ExpensifyIntegrations`,
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            data: body,
            retries: 3
        });

        const { data } = response;

        if (data.skippedEmployees && data.skippedEmployees.length > 0) {
            await nango.log(JSON.stringify(data, null, 2), { level: 'error' });

            return {
                success: false
            };
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
