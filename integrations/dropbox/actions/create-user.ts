import type { NangoAction, ProxyConfiguration, CreateUser, User } from '../../models';
import { createUserSchema } from '../schema.zod.js';
import type { DropboxCreatedUser } from '../types';

export default async function runAction(nango: NangoAction, input: CreateUser): Promise<User> {
    nango.zodValidate({ zodSchema: createUserSchema, input });

    const config: ProxyConfiguration = {
        // https://www.dropbox.com/developers/documentation/http/teams#team-members-add
        endpoint: `/2/team/members/add_v2`,
        data: dropboxInput,
        retries: 10
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
