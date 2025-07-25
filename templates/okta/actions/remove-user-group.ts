import { createAction } from "nango";
import { oktaAssignRemoveUserGroupSchema } from '../schema.zod.js';

import type { ProxyConfiguration } from "nango";
import { SuccessResponse, OktaAssignRemoveUserGroup } from "../models.js";

const action = createAction({
    description: "Unassigns a user from a group with the OKTA_GROUP type",
    version: "1.0.0",

    endpoint: {
        method: "DELETE",
        path: "/user-groups",
        group: "User Groups"
    },

    input: OktaAssignRemoveUserGroup,
    output: SuccessResponse,
    scopes: ["okta.groups.manage"],

    exec: async (nango, input): Promise<SuccessResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: oktaAssignRemoveUserGroupSchema, input });

        const config: ProxyConfiguration = {
            // https://developer.okta.com/docs/api/openapi/okta-management/management/tag/Group/#tag/Group/operation/unassignUserFromGroup
            endpoint: `/api/v1/groups/${parsedInput.data.groupId}/users/${parsedInput.data.userId}`,
            retries: 3
        };

        await nango.delete(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
