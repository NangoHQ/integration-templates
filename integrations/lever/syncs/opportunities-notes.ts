import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LIMIT = 100;

const LeverOpportunityResponseSchema = z.object({
    id: z.string()
});

const LeverOpportunityNoteResponseSchema = z.object({
    id: z.string(),
    text: z.string().nullish(),
    fields: z.array(z.unknown()).nullish(),
    user: z.string().nullish(),
    secret: z.boolean().nullish(),
    completedAt: z.number().nullish(),
    createdAt: z.number().nullish(),
    deletedAt: z.number().nullish()
});

const LeverOpportunityNoteSchema = z.object({
    id: z.string(),
    text: z.string().optional(),
    fields: z.array(z.unknown()).optional(),
    user: z.string().optional(),
    secret: z.boolean().optional(),
    completedAt: z.number().optional(),
    createdAt: z.number().optional(),
    deletedAt: z.number().optional()
});

const sync = createSync({
    description: 'Fetches a list of all notes for every single opportunity',
    version: '3.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    scopes: ['notes:read:admin'],
    models: {
        LeverOpportunityNote: LeverOpportunityNoteSchema
    },
    metadata: z.object({}),

    exec: async (nango) => {
        // Blocker: the Lever notes endpoint does not support time-based or cursor-based
        // delta filtering. Notes must be fetched by enumerating all opportunities and
        // listing notes for each opportunity, so the only way to ensure completeness is a
        // full refresh.
        await nango.trackDeletesStart('LeverOpportunityNote');

        let totalRecords = 0;

        const opportunities = await getAllOpportunities(nango);

        for (const opportunity of opportunities) {
            const config: ProxyConfiguration = {
                // https://hire.lever.co/developer/documentation#list-all-notes
                endpoint: `/v1/opportunities/${encodeURIComponent(opportunity.id)}/notes`,
                paginate: {
                    type: 'cursor',
                    cursor_path_in_response: 'next',
                    cursor_name_in_request: 'offset',
                    limit_name_in_request: 'limit',
                    response_path: 'data',
                    limit: LIMIT
                },
                retries: 3
            };
            for await (const noteBatch of nango.paginate<z.infer<typeof LeverOpportunityNoteResponseSchema>>(config)) {
                const mappedNotes = noteBatch.map(mapNote);
                const batchSize = mappedNotes.length;
                totalRecords += batchSize;
                await nango.log(`Saving batch of ${batchSize} note(s) for opportunity ${opportunity.id} (total note(s): ${totalRecords})`);
                await nango.batchSave(mappedNotes, 'LeverOpportunityNote');
            }
        }

        await nango.trackDeletesEnd('LeverOpportunityNote');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function getAllOpportunities(nango: NangoSyncLocal): Promise<z.infer<typeof LeverOpportunityResponseSchema>[]> {
    const records: z.infer<typeof LeverOpportunityResponseSchema>[] = [];
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
        },
        retries: 3
    };

    for await (const recordBatch of nango.paginate<z.infer<typeof LeverOpportunityResponseSchema>>(config)) {
        for (const item of recordBatch) {
            records.push(LeverOpportunityResponseSchema.parse(item));
        }
    }

    return records;
}

function mapNote(note: unknown): z.infer<typeof LeverOpportunityNoteSchema> {
    const parsed = LeverOpportunityNoteResponseSchema.parse(note);
    return {
        id: parsed.id,
        ...(parsed.text != null && { text: parsed.text }),
        ...(parsed.fields != null && { fields: parsed.fields }),
        ...(parsed.user != null && { user: parsed.user }),
        ...(parsed.secret != null && { secret: parsed.secret }),
        ...(parsed.completedAt != null && { completedAt: parsed.completedAt }),
        ...(parsed.createdAt != null && { createdAt: parsed.createdAt }),
        ...(parsed.deletedAt != null && { deletedAt: parsed.deletedAt })
    };
}
