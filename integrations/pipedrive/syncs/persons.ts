import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { PipeDrivePerson } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches persons from pipedrive',
    version: '1.0.0',
    frequency: 'every half hour',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/pipedrive/persons'
        }
    ],

    scopes: ['contacts:read'],

    models: {
        PipeDrivePerson: PipeDrivePerson
    },

    metadata: z.object({}),

    exec: async (nango) => {
        let totalRecords = 0;

        const config: ProxyConfiguration = {
            // https://developers.pipedrive.com/docs/api/v1/Persons#getPersonsCollection
            endpoint: '/v1/persons/collection',
            ...(nango.lastSyncDate ? { params: { since: nango.lastSyncDate?.toISOString() } } : {}),
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'additional_data.next_cursor',
                cursor_name_in_request: 'cursor',
                limit_name_in_request: 'limit',
                response_path: 'data',
                limit: 100
            }
        };
        for await (const person of nango.paginate(config)) {
            const mappedPerson: PipeDrivePerson[] = person.map(mapPerson) || [];
            // Save Person
            const batchSize: number = mappedPerson.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} persons (total persons: ${totalRecords})`);
            await nango.batchSave(mappedPerson, 'PipeDrivePerson');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapPerson(person: any): PipeDrivePerson {
    return {
        id: person.id,
        active_flag: person.active_flag,
        owner_id: person.owner_id,
        org_id: person.org_id,
        name: person.name,
        phone: person.phone,
        email: person.email,
        update_time: person.update_time,
        delete_time: person.delete_time,
        add_time: person.add_time,
        visible_to: person.visible_to,
        picture_id: person.picture_id,
        label: person.picture_id,
        cc_email: person.cc_email
    };
}
