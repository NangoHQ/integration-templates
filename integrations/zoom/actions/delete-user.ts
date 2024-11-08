import type { NangoAction, ProxyConfiguration, SuccessResponse, EmailEntity } from '../../models';
import { emailEntitySchema } from '../schema.zod';
import { ZoomUser } from '../types';

export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {

    const parsedInput = emailEntitySchema.safeParse(input);
    if (!parsedInput.success) {
        throw new nango.ActionError({
            message: 'Invalid input provided to delete a user'
        });
    }

    const getUserConfig: ProxyConfiguration = {
        // https://developers.zoom.us/docs/api/rest/reference/user/methods/#operation/users
        endpoint: `users/${input.email}`,
        retries: 10
    };

    const { data: user } = await nango.get<ZoomUser>(getUserConfig);
    
    if (!user) {
        throw new nango.ActionError({
            message: `No user found with email ${input.email}`
        });
    }

    const deleteUserConfig: ProxyConfiguration = {
        // https://developers.zoom.us/docs/api/rest/reference/user/methods/#operation/userDelete
        endpoint: `/users/${user.id}`,
        retries: 10
    };

    await nango.delete(deleteUserConfig);

    return {
        success: true
    };
}
