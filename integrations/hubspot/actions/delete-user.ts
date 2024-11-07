import type { NangoAction, ProxyConfiguration, SuccessResponse, EmailEntity } from '../../models';
// import type { HubspotUser } from '../types';
import { emailEntitySchema } from '../schema.zod';

export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {

    const parsedInput = emailEntitySchema.safeParse(input);

    if (!parsedInput.success) {
        throw new nango.ActionError({
            message: 'Invalid input provided to delete a user'
        });
    }

    const deleteUserConfig: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/settings/user-provisioning
        params: {
            idProperty: 'EMAIL'
        },
        endpoint: `/settings/v3/users/${input.email}`,
        retries: 10
    };

    await nango.delete(deleteUserConfig);

    return {
        success: true
    };
}
