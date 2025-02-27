import type { NangoAction, User, CreateUser } from '../../models';
import { createUserSchema } from '../schema.zod.js';
import type { OrganizationInvitation } from '../types';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Calendly API call to invitate (create) a new user to an organization.
 */
export default async function runAction(nango: NangoAction, input: CreateUser): Promise<User> {
    nango.zodValidateInput({ zodSchema: createUserSchema, input });

    const config = {
        // https://developer.calendly.com/api-docs/b3A6MjU2MzQ5Nzc-invite-user-to-organization
        endpoint: '/organization_invitations',
        data: {
            email: input.email
        },
        retries: 10
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
