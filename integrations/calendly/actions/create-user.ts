import type { NangoAction, ProxyConfiguration, User, CreateUser } from '../../models';
import { getOrganizationId } from '../helpers/get-organizationId.js';
import { createUserSchema } from '../schema.zod.js';
import type { OrganizationInvitation } from '../types';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Calendly API call to invitate (create) a new user to an organization.
 */
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

    const organization = await getOrganizationId(nango);

    const config: ProxyConfiguration = {
        // https://developer.calendly.com/api-docs/094d15d2cd4ab-invite-user-to-organization
        endpoint: `/organizations/${organization.id}/invitations`,
        data: {
            email: parsedInput.data.email
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