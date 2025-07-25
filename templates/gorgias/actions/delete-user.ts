import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { SuccessResponse, IdEntity } from "../models.js";

/**
 * Deletes a user based on the provided email address.
 *
 * @param {NangoAction} nango - The Nango action instance.
 * @param {EmailEntity} input - The input containing the email of the user to be deleted.
 * @throws {nango.ActionError} - Throws an error if the email is not provided.
 *
 * {@link https://developers.gorgias.com/reference/delete-user} for more information on the Gorgias API endpoint.
 */
const action = createAction({
    description: "Deletes a user in Gorgias",
    version: "1.0.0",

    endpoint: {
        method: "DELETE",
        path: "/users",
        group: "Users"
    },

    input: IdEntity,
    output: SuccessResponse,
    scopes: ["users:write"],

    exec: async (nango, input): Promise<SuccessResponse> => {
        if (!input.id) {
            throw new nango.ActionError({
                message: 'Id is required to delete a user'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.gorgias.com/reference/delete-user
            endpoint: `/api/users/${input.id}`,
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
