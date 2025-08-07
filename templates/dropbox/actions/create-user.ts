import { createAction } from "nango";
import { createUserSchema } from '../schema.zod.js';
import type { DropboxCreatedUser } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { User, CreateUser } from "../models.js";

const action = createAction({
    description: "Creates a user in Dropbox. Requires Dropbox Business.",
    version: "2.0.0",

    endpoint: {
        method: "POST",
        path: "/users",
        group: "Users"
    },

    input: CreateUser,
    output: User,
    scopes: ["members.write"],

    exec: async (nango, input): Promise<User> => {
        await nango.zodValidateInput({ zodSchema: createUserSchema, input });

        const dropboxInput = {
            new_members: [
                {
                    member_email: input.email,
                    member_given_name: input.firstName,
                    member_surname: input.lastName
                }
            ]
        };

        const config: ProxyConfiguration = {
            // https://www.dropbox.com/developers/documentation/http/teams#team-members-add
            endpoint: `/2/team/members/add_v2`,
            data: dropboxInput,
            retries: 3
        };

        const response = await nango.post<DropboxCreatedUser>(config);
        const { data } = response;

        const [member] = data.complete;

        if (!member) {
            throw new nango.ActionError({
                message: 'Failed to create user'
            });
        }

        const user: User = {
            id: member.profile.account_id,
            firstName: member.profile.name.given_name,
            lastName: member.profile.name.surname,
            email: member.profile.email
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
