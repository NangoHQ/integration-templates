import type { NangoAction, ProxyConfiguration, User, FreshdeskCreateUser } from '../../models';
import { freshdeskCreateUserSchema } from '../schema.zod.js';
import type { FreshdeskUser } from '../types';

/**
 * Creates a new user in Freshdesk by validating input data against a schema,
 * sending a request to the Freshdesk API, logging any validation errors, and
 * returning a common Nango User object
 *
 * Create user Freshdesk API docs: https://developer.freshdesk.com/api/#create_contact
 *
 */
export default async function runAction(nango: NangoAction, input: FreshdeskCreateUser): Promise<User> {
    const parsedInput = freshdeskCreateUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }

    const { email, phone, mobile } = parsedInput.data;

    if (!email && !phone && !mobile) {
        await nango.log('At least one of email, phone, or mobile must be provided.', { level: 'error' });

        throw new nango.ActionError({
            message: 'At least one of email, phone, or mobile must be provided.'
        });
    }

    const config: ProxyConfiguration = {
        endpoint: `/api/v2/contacts`,
        data: parsedInput.data,
        retries: 10
    };

    const response = await nango.post<FreshdeskUser>(config);

    const { data: freshdeskUser } = response;
    const [firstName, lastName] = (freshdeskUser?.name ?? '').split(' ');

    const user: User = {
        id: freshdeskUser.id.toString(),
        firstName: firstName || '',
        lastName: lastName || '',
        email: freshdeskUser.email || ''
    };

    return user;
}
