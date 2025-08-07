import { createAction } from "nango";
import { updateContactInputSchema } from '../schema.zod.js';
import { toSalesForceContact } from '../mappers/toContact.js';

import type { ProxyConfiguration } from "nango";
import { SuccessResponse, UpdateContactInput } from "../models.js";

const action = createAction({
    description: "Update a single contact in salesforce",
    version: "2.0.0",

    endpoint: {
        method: "PATCH",
        path: "/contacts",
        group: "Contacts"
    },

    input: UpdateContactInput,
    output: SuccessResponse,
    scopes: ["offline_access", "api"],

    exec: async (nango, input): Promise<SuccessResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: updateContactInputSchema, input });

        const salesforceContact = toSalesForceContact(parsedInput.data);
        const config: ProxyConfiguration = {
            // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_contact.htm
            endpoint: `/services/data/v60.0/sobjects/Contact/${parsedInput.data.id}`,
            data: salesforceContact,
            retries: 3
        };

        await nango.patch(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
