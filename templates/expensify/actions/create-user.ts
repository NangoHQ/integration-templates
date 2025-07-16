import { createAction } from "nango";
import { getAdminPolicy } from '../helpers/policies.js';
import { getCredentials } from '../helpers/credentials.js';
import { createUserSchema } from '../schema.zod.js';

import { ExpsensifyNullableUser, CreateUser } from "../models.js";

const action = createAction({
    description: "Create a user in the account",
    version: "1.0.0",

    endpoint: {
        method: "POST",
        path: "/users",
        group: "Users"
    },

    input: CreateUser,
    output: ExpsensifyNullableUser,

    exec: async (nango, input): Promise<ExpsensifyNullableUser> => {
        await nango.zodValidateInput({ zodSchema: createUserSchema, input });

        const credentials = await getCredentials(nango);

        const defaultPolicy = await getAdminPolicy(nango);

        const { id: defaultPolicyId, owner } = defaultPolicy;

        await nango.log(`Default policy found: ${defaultPolicyId}`);

        const employeeID = Math.random().toString(16).slice(2);

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
                    employeeEmail: input.email,
                    managerEmail: owner,
                    firstName: input.firstName,
                    customField2: `${input.firstName} ${input.lastName}`,
                    policyID: defaultPolicyId,
                    lastName: input.lastName,
                    employeeID
                }
            ]),
            `--${boundary}--`
        ].join('\r\n');

        const resp = await nango.post({
            // https://integrations.expensify.com/Integration-Server/doc/employeeUpdater/
            endpoint: `/ExpensifyIntegrations`,
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            data: body,
            retries: 3
        });

        const { data } = resp;

        if (data.updatedEmployeesCount || data.updatedEmployeesCount !== 1) {
            await nango.log(JSON.stringify(data, null, 2), { level: 'error' });

            throw new nango.ActionError({
                message: 'Failed to create the user'
            });
        }

        const user: ExpsensifyNullableUser = {
            id: employeeID,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
