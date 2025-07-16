import { createAction } from "nango";
import { idEntitySchema } from '../schema.zod.js';

import type { ProxyConfiguration } from "nango";
import { SuccessResponse, IdEntity } from "../models.js";

/**
 * Deletes a user in Freshdesk
 *
 * Delete user Freshdesk API docs: https://developer.freshdesk.com/api/#soft_delete_contact
 *
 */
const action = createAction({
    description: "Deletes a contact in FreshDesk",
    version: "1.0.0",

    endpoint: {
        method: "DELETE",
        path: "/contacts",
        group: "Contacts"
    },

    input: IdEntity,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

        const config: ProxyConfiguration = {
            // https://developer.freshdesk.com/api/#soft_delete_contact
            endpoint: `/api/v2/contacts/${input.id}`,
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
