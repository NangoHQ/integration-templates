import { createAction } from "nango";
import { idEntitySchema } from '../schema.zod.js';
import type { IntercomDeleteContactResponse } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { SuccessResponse, IdEntity } from "../models.js";

/**
 * Deletes an Intercom contact.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Intercom API to delete a contact by their ID. If the input is invalid,
 * it logs the errors and throws an ActionError.
 *
 * @param {NangoAction} nango - The Nango action context, used for logging and making API requests.
 * @param {IdEntity} input - The input data containing the ID of the contact to be deleted
 *
 * @returns {Promise<SuccessResponse>} - A promise that resolves to a SuccessResponse object indicating the result of the deletion.
 *
 * @throws {nango.ActionError} - Throws an error if the input validation fails.
 *
 * For detailed endpoint documentation, refer to:
 * https://developers.intercom.com/docs/references/rest-api/api.intercom.io/contacts/deletecontact
 */
const action = createAction({
    description: "Deletes a contact in Intercom",
    version: "0.0.1",

    endpoint: {
        method: "DELETE",
        path: "/contact"
    },

    input: IdEntity,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

        const config: ProxyConfiguration = {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/contacts/deletecontact
            endpoint: `/contacts/${parsedInput.data.id}`,
            retries: 3
        };

        const response = await nango.delete<IntercomDeleteContactResponse>(config);

        return {
            success: response.data.deleted
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
