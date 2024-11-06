import type { NangoAction, ProxyConfiguration, CreateUser, User } from '../../models';
import { createUserSchema } from '../schema.zod.js';
import type { DropboxCreatedUser } from '../types';

export default async function runAction(nango: NangoAction, input: CreateUser): Promise<User> {
    const parsedInput = createUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }

    const dropboxInput = {
        new_members: [
            {
                member_email: parsedInput.data.email,
                member_given_name: parsedInput.data.firstName,
                member_surname: parsedInput.data.lastName
            }
        ]
    };

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
