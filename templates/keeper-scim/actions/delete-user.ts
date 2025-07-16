import { createAction } from "nango";
import { idEntitySchema } from '../schema.zod.js';

import type { ProxyConfiguration } from "nango";
import { SuccessResponse, IdEntity } from "../models.js";

/**
 * Deletes an Keeper user contact.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Keeper API to delete a user by their ID. If the input is invalid,
 * it logs the errors and throws an ActionError.
 *
 * @param {NangoAction} nango - The Nango action context, used for logging and making API requests.
 * @param {IdEntity} input - The input data containing the ID of the user contact to be deleted
 *
 * @returns {Promise<SuccessResponse>} - A promise that resolves to a SuccessResponse object indicating the result of the deletion.
 *
 * @throws {nango.ActionError} - Throws an error if the input validation fails.
 *
 * For detailed endpoint documentation, refer to:
 * https://docs.keeper.io/en/enterprise-guide/user-and-team-provisioning/automated-provisioning-with-scim
 */
const action = createAction({
    description: "Deletes a user in Keeper",
    version: "0.0.1",

    endpoint: {
        method: "DELETE",
        path: "/users",
        group: "Users"
    },

    input: IdEntity,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

        const config: ProxyConfiguration = {
            // https://docs.keeper.io/en/enterprise-guide/user-and-team-provisioning/automated-provisioning-with-scim
            endpoint: `/Users/${parsedInput.data.id}`,
            retries: 3
        };

        // no body content expected for successful requests
        await nango.delete(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
