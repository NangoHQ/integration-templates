import type { NangoAction, ProxyConfiguration, SuccessResponse, OktaAssignRemoveUserGroup, ActionResponseError } from '../../models';
import { oktaAssignRemoveUserGroupSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: OktaAssignRemoveUserGroup): Promise<SuccessResponse> {
    const parsedInput = oktaAssignRemoveUserGroupSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to assign user to group: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError<ActionResponseError>({
            message: 'Invalid input provided to assign a user to a group'
        });

    }
    const config: ProxyConfiguration = {
        // https://developer.okta.com/docs/api/openapi/okta-management/management/tag/Group/#tag/Group/operation/assignUserToGroup
        endpoint: `/api/v1/groups/${parsedInput.data.groupId}/users/${parsedInput.data.userId}`,
        retries: 10
    };

    await nango.put(config);

    return {
        success: true
    };
}
