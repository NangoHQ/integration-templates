import type { NangoAction, ProxyConfiguration, SuccessResponse, OktaAssignRemoveUserGroup } from '../../models';
import { oktaAssignRemoveUserGroupSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: OktaAssignRemoveUserGroup): Promise<SuccessResponse> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: oktaAssignRemoveUserGroupSchema, input });

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
