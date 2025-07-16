import { createAction } from "nango";
import { getOrganizationId } from '../helpers/get-organization-id.js';
import { createUserSchema } from '../schema.zod.js';
import type { OrganizationInvitation } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { User, CreateUser } from "../models.js";

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Calendly API call to invitate (create) a new user to an organization.
 */
const action = createAction({
    description: "Creates a user in Calendly",
    version: "1.0.0",

    endpoint: {
        method: "POST",
        path: "/users",
        group: "Users"
    },

    input: CreateUser,
    output: User,
    scopes: ["admin"],

    exec: async (nango, input): Promise<User> => {
        await nango.zodValidateInput({ zodSchema: createUserSchema, input });

        const organizationId = await getOrganizationId(nango);

        const config: ProxyConfiguration = {
            // https://developer.calendly.com/api-docs/094d15d2cd4ab-invite-user-to-organization
            endpoint: `/organizations/${organizationId}/invitations`,
            data: {
                email: input.email
            },
            retries: 3
        };

        const response = await nango.post<{ resource: OrganizationInvitation }>(config);

        const newUser = response.data.resource;
        const user: User = {
            id: newUser.uri.split('/').pop() ?? '',
            firstName: '',
            lastName: '',
            email: newUser.email
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
