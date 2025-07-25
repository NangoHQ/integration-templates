import { createAction } from "nango";
import type { BillCreateUserInput, BillUser } from '../types.js';
import { billCreateUserSchema } from '../schema.zod.js';
import { getHeaders } from '../helpers/get-headers.js';
import { getDefaultRoleId } from '../helpers/get-default-role.js';

import type { ProxyConfiguration } from "nango";
import { User, BillCreateUser } from "../models.js";

const action = createAction({
    description: "Creates a user in Bill.",
    version: "1.0.0",

    endpoint: {
        method: "POST",
        path: "/users",
        group: "Users"
    },

    input: BillCreateUser,
    output: User,

    exec: async (nango, input): Promise<User> => {
        await nango.zodValidateInput({ zodSchema: billCreateUserSchema, input });

        const headers = await getHeaders(nango);

        let roleId = input.roleId;

        if (!roleId) {
            roleId = await getDefaultRoleId(nango, headers);
        }

        const BillInput: BillCreateUserInput = {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            roleId,
            acceptTermsOfService: input.acceptTermsOfService || true
        };

        const config: ProxyConfiguration = {
            // https://developer.bill.com/reference/createorganizationuser
            endpoint: '/v3/users',
            data: BillInput,
            retries: 3,
            headers: {
                sessionId: headers.sessionId,
                devKey: headers.devKey
            }
        };

        const response = await nango.post<BillUser>(config);

        const { data } = response;

        const user: User = {
            id: data.id,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
