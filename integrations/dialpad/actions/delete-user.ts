import type { NangoAction, ProxyConfiguration, SuccessResponse, EmailEntity } from '../../models';
import { emailEntitySchema } from '../schema.zod.js';

/**
 * Executes the delete user action by validating email input, fetching the user ID,
 * and making the API call to Dialpad to delete the user.
 * API Reference: https://developers.dialpad.com/reference/usersdelete
 */
export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {
    const parsedInput = emailEntitySchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to delete a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid email provided to delete a user'
        });
    }

    // Fetch the user ID using the email
    const userId = await fetchUserIdByEmail(nango, parsedInput.data.email);
    if (!userId) {
        throw new nango.ActionError({
            message: `User with email ${parsedInput.data.email} not found`
        });
    }

    // Delete the user by ID
    const config: ProxyConfiguration = {
        // https://developers.dialpad.com/reference/usersdelete
        endpoint: `/api/v2/users/${encodeURIComponent(userId)}`,
        retries: 10
    };

    await nango.delete(config);

    return {
        success: true
    };
}

//Fetches the user ID by email from Dialpad.
async function fetchUserIdByEmail(nango: NangoAction, email: string): Promise<string | null> {
    const config: ProxyConfiguration = {
        // https://developers.dialpad.com/reference/userslist
        endpoint: '/api/v2/users',
        params: {
            email: encodeURIComponent(email)
        },
        retries: 10
    };

    const response = await nango.get<{ users: { id: string; email: string }[] }>(config);
    const user = response.data.users.find((user) => user.email === email);

    return user ? user.id : null;
}
