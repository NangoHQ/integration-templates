import { createAction } from "nango";
import type { ZoomCreatedUser } from '../types.js';
import { createUserSchema } from '../schema.zod.js';

import type { ProxyConfiguration } from "nango";
import { User, ZoomCreateUser } from "../models.js";

const action = createAction({
    description: "Creates a user in Zoom. Requires Pro account or higher",
    version: "1.0.0",

    endpoint: {
        method: "POST",
        path: "/users",
        group: "Users"
    },

    input: ZoomCreateUser,
    output: User,
    scopes: ["user:write", "user:write:admin"],

    exec: async (nango, input): Promise<User> => {
        await nango.zodValidateInput({ zodSchema: createUserSchema, input });

        const zoomInput = {
            action: input.action || 'create',
            user_info: {
                ...input,
                email: input.email,
                first_name: input.firstName,
                last_name: input.lastName,
                type: determineUserType(input.type)
            }
        };

        const config: ProxyConfiguration = {
            // https://developers.zoom.us/docs/api/rest/reference/user/methods/#operation/userCreate
            endpoint: 'users',
            data: zoomInput,
            retries: 3
        };
        const response = await nango.post<ZoomCreatedUser>(config);

        const { data } = response;

        const user: User = {
            id: data.id.toString(),
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;

function determineUserType(type: ZoomCreateUser['type']): number {
    switch (type) {
        case 'basic':
            return 1;
        case 'licensed':
            return 2;
        case 'UnassignedWithoutMeetingsBasic':
            return 4;
        case 'None':
            return 99;
        default:
            return 1;
    }
}
