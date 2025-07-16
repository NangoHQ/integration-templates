import { createAction } from "nango";
import { createContactInputSchema } from '../schema.zod.js';
import { toSalesForceContact } from '../mappers/toContact.js';

import type { ProxyConfiguration } from "nango";
import { ActionResponse, CreateContactInput } from "../models.js";

const action = createAction({
    description: "Create a single contact in salesforce",
    version: "1.0.2",

    endpoint: {
        method: "POST",
        path: "/contacts",
        group: "Contacts"
    },

    input: CreateContactInput,
    output: ActionResponse,
    scopes: ["offline_access", "api"],

    exec: async (nango, input): Promise<ActionResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: createContactInputSchema, input });

        const salesforceContact = toSalesForceContact(parsedInput.data);
        const config: ProxyConfiguration = {
            // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_contact.htm
            endpoint: '/services/data/v60.0/sobjects/Contact',
            data: salesforceContact,
            retries: 3
        };
        const response = await nango.post(config);

        return response.data;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
