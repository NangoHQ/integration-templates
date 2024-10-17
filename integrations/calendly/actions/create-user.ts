import type { NangoAction, ProxyConfiguration, User, CreateUser } from '../../models';
import { getOrganizationId } from '../helpers/get-organizationId';
import { createUserSchema } from '../schema.zod.js';
import type { OrganizationInvitation } from '../types';

// TODO: docs
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

    const organizationId = await getOrganizationId(nango);
    const config: ProxyConfiguration = {
        // https://developer.calendly.com/api-docs/094d15d2cd4ab-invite-user-to-organization
        endpoint: `/organizations/${organizationId}/invitations`,
        data: {
            email: parsedInput.data.email
        },
        retries: 10
    };

    // TODO: check on the response
    const response = await nango.post<{ resource: OrganizationInvitation }>(config);
    const {
        data: { resource }
    } = response;

    console.log('response', resource);

    const user: User = {
        id: '',
        firstName: '',
        lastName: '',
        email: ''
    };

    return user;
}
