import { createSync } from "nango";
import type { RingCentralContactRecord } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { Contact } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches the list of external contacts from RingCentral",
    version: "1.0.0",
    frequency: "every day",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/contacts",
        group: "Contacts"
    }],

    scopes: ["ReadContacts"],

    models: {
        Contact: Contact
    },

    metadata: z.object({}),

    exec: async nango => {
        const config: ProxyConfiguration = {
            // https://developers.ringcentral.com/api-reference/External-Contacts/listContacts
            endpoint: '/restapi/v1.0/account/~/extension/~/address-book/contact',
            retries: 10,
            paginate: {
                type: 'offset',
                response_path: 'records',
                offset_name_in_request: 'page',
                offset_calculation_method: 'per-page',
                offset_start_value: 1,
                limit_name_in_request: 'perPage',
                limit: 100
            }
        };

        for await (const records of nango.paginate<RingCentralContactRecord>(config)) {
            const contacts = records.map(
                (record): Contact => ({
                    id: record.id.toString(),
                    firstName: record.firstName,
                    lastName: record.lastName,
                    email: record.email,
                    phoneNumbers: record.phoneNumbers,
                    company: record.company,
                    jobTitle: record.jobTitle,
                    notes: record.notes
                })
            );

            await nango.batchSave(contacts, 'Contact');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
