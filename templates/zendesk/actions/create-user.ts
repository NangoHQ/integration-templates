import { createAction } from "nango";
import { getSubdomain } from '../helpers/get-subdomain.js';
import { createUserSchema } from '../schema.zod.js';
import type { ZendeskUser } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { User, CreateUser } from "../models.js";

const action = createAction({
    description: "Create an admin or agent user in Zendesk. Defaults to agent if a role is not provided",
    version: "0.0.1",

    endpoint: {
        method: "POST",
        path: "/users",
        group: "Users"
    },

    input: CreateUser,
    output: User,
    scopes: ["users:write"],

    exec: async (nango, input): Promise<User> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: createUserSchema, input });

        const subdomain = await getSubdomain(nango);

        const data = {
            user: {
                name: `${parsedInput.data.firstName} ${parsedInput.data.lastName}`,
                email: parsedInput.data.email,
                role: parsedInput.data.role || 'agent'
            }
        };

        const config: ProxyConfiguration = {
            baseUrlOverride: `https://${subdomain}.zendesk.com`,
            // https://developer.zendesk.com/api-reference/ticketing/users/users/#create-user
            endpoint: '/api/v2/users',
            retries: 3,
            data
        };

        const response = await nango.post<{ user: ZendeskUser }>(config);

        const { data: dataResponse } = response;

        const user: User = {
            id: dataResponse.user.id.toString(),
            firstName: dataResponse.user.name.split(' ')[0] || '',
            lastName: dataResponse.user.name.split(' ')[1] || '',
            email: dataResponse.user.email
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
