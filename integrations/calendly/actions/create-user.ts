import type { NangoAction, ProxyConfiguration, User, CreateUser } from '../../models';
import { getOrganizationId } from '../helpers/get-organization-id.js';
import { createUserSchema } from '../schema.zod.js';
import type { OrganizationInvitation } from '../types';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Calendly API call to invitate (create) a new user to an organization.
 */
export default async function runAction(nango: NangoAction, input: CreateUser): Promise<User> {
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
