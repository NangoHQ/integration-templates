import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { LeverOpportunityNote } from '../models.js';
import { z } from 'zod';

const LIMIT = 100;

const sync = createSync({
    description: 'Fetches a list of all notes for every single opportunity',
    version: '2.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'full',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/notes',
            group: 'Notes'
        }
    ],

    scopes: ['notes:read:admin'],

    models: {
        LeverOpportunityNote: LeverOpportunityNote
    },

    metadata: z.object({}),

    exec: async (nango) => {
        let totalRecords = 0;

        const opportunities: any[] = await getAllOpportunities(nango);

        for (const opportunity of opportunities) {
            const config: ProxyConfiguration = {
                // https://hire.lever.co/developer/documentation#list-all-notes
                endpoint: `/v1/opportunities/${opportunity.id}/notes`,
                paginate: {
                    type: 'cursor',
                    cursor_path_in_response: 'next',
                    cursor_name_in_request: 'offset',
                    limit_name_in_request: 'limit',
                    response_path: 'data',
                    limit: LIMIT
                }
            };
            for await (const note of nango.paginate(config)) {
                const mappedNote: LeverOpportunityNote[] = note.map(mapNote) || [];
                // Save notes
                const batchSize: number = mappedNote.length;
                totalRecords += batchSize;
                await nango.log(`Saving batch of ${batchSize} note(s) for opportunity ${opportunity.id} (total note(s): ${totalRecords})`);
                await nango.batchSave(mappedNote, 'LeverOpportunityNote');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function getAllOpportunities(nango: NangoSyncLocal) {
    const records: any[] = [];
    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#list-all-opportunities
        endpoint: '/v1/opportunities',
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'next',
            cursor_name_in_request: 'offset',
            limit_name_in_request: 'limit',
            response_path: 'data',
            limit: LIMIT
        }
    };

    for await (const recordBatch of nango.paginate(config)) {
        records.push(...recordBatch);
    }

    return records;
}

function mapNote(note: any): LeverOpportunityNote {
    return {
        id: note.id,
        text: note.text,
        fields: note.fields,
        user: note.user,
        secret: note.secret,
        completedAt: note.completedAt,
        createdAt: note.createdAt,
        deletedAt: note.deletedAt
    };
}
