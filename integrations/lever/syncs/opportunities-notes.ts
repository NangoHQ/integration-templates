import type { LeverOpportunityNote, NangoSync, ProxyConfiguration } from '../../models';

const LIMIT = 100;

export default async function fetchData(nango: NangoSync) {
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

async function getAllOpportunities(nango: NangoSync) {
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
