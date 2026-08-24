import { createSync } from 'nango';
import type { RingCentralContactRecord } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { Contact } from '../models.js';
import { z } from 'zod';

const CheckpointSchema = z.object({
    page: z.number()
});

const PhoneNumberSchema = z.object({
    type: z.union([z.literal('work'), z.literal('mobile'), z.literal('other')]),
    value: z.string()
});

const RingCentralContactRecordSchema = z.object({
    id: z.number(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phoneNumbers: z.array(PhoneNumberSchema).optional(),
    company: z.string().optional(),
    jobTitle: z.string().optional(),
    notes: z.string().optional()
});

const sync = createSync({
    description: 'Fetches the list of external contacts from RingCentral',
    version: '1.1.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',
    checkpoint: CheckpointSchema,

    endpoints: [
        {
            method: 'GET',
            path: '/contacts',
            group: 'Contacts'
        }
    ],

    scopes: ['ReadContacts'],

    models: {
        Contact: Contact
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let page = checkpoint?.page ?? 1;

        await nango.trackDeletesStart('Contact');

        const config: ProxyConfiguration = {
            // https://developers.ringcentral.com/api-reference/External-Contacts/listContacts
            endpoint: '/restapi/v1.0/account/~/extension/~/address-book/contact',
            retries: 10,
            paginate: {
                type: 'offset',
                response_path: 'records',
                offset_name_in_request: 'page',
                offset_calculation_method: 'per-page',
                offset_start_value: page,
                limit_name_in_request: 'perPage',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : page;
                }
            }
        };

        for await (const records of nango.paginate<RingCentralContactRecord>(config)) {
            const parsed = RingCentralContactRecordSchema.array().safeParse(records);
            if (!parsed.success) {
                throw new Error(`Failed to parse contact records: ${parsed.error.message}`);
            }

            const contacts = parsed.data.map(
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

            if (typeof page === 'number') {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Contact');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
