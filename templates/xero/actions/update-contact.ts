import { createAction } from "nango";
import { getTenantId } from '../helpers/get-tenant-id.js';
import { toXeroContact, toContact } from '../mappers/to-contact.js';

import type { ProxyConfiguration } from "nango";

import type {
    FailedContact,
    ActionErrorResponse} from "../models.js";
import {
    ContactActionResponse,
    Anonymous_xero_action_updatecontact_input
} from "../models.js";

const action = createAction({
    description: "Updates one or multiple contacts in Xero. Only fields that are passed in are modified. If a field should not be changed, omit it in the input. The id field is mandatory.",
    version: "1.0.3",

    endpoint: {
        method: "PUT",
        path: "/contacts",
        group: "Contacts"
    },

    input: Anonymous_xero_action_updatecontact_input,
    output: ContactActionResponse,
    scopes: ["accounting.contacts"],

    exec: async (nango, input): Promise<ContactActionResponse> => {
        const tenant_id = await getTenantId(nango);

        // Check if input is an array
        if (!input || !input.length) {
            throw new nango.ActionError<ActionErrorResponse>({
                message: `You must pass an array of contacts! Received: ${JSON.stringify(input)}`
            });
        }

        // Check if every contact has at least id set (this is required by Xero)
        const invalidContacts = input.filter((x: any) => !x.id);
        if (invalidContacts.length > 0) {
            throw new nango.ActionError<ActionErrorResponse>({
                message: `Some contacts are missing the id property, which is mandatory to update contacts. Affected contacts:\n${JSON.stringify(
                    invalidContacts,
                    null,
                    4
                )}`
            });
        }

        const config: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/contacts/#post-contacts
            endpoint: 'api.xro/2.0/Contacts',
            headers: {
                'xero-tenant-id': tenant_id
            },
            params: {
                summarizeErrors: 'false'
            },
            data: {
                Contacts: input.map(toXeroContact)
            },
            retries: 3
        };

        const res = await nango.post(config);
        const contacts = res.data.Contacts;

        // Check if Xero failed import of any contacts
        const failedContacts = contacts.filter((x: any) => x.HasValidationErrors);
        if (failedContacts.length > 0) {
            await nango.log(
                `Some contacts could not be updated in Xero due to validation errors. Note that the remaining contacts (${
                    input.length - failedContacts.length
                }) were created successfully. Affected contacts:\n${JSON.stringify(failedContacts, null, 4)}`,
                { level: 'error' }
            );
        }

        const succeededContacts = contacts.filter((x: any) => !x.HasValidationErrors);

        return {
            succeededContacts: succeededContacts.map(toContact),
            failedContacts: failedContacts.map(mapFailedXeroContact)
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;

function mapFailedXeroContact(xeroContact: any): FailedContact {
    return {
        ...toContact(xeroContact),
        validation_errors: xeroContact.ValidationErrors
    };
}
