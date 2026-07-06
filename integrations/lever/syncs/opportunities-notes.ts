import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LIMIT = 100;

const LeverOpportunityResponseSchema = z.object({
    id: z.string()
});

const OpportunityPageSchema = z.object({
    data: z.array(LeverOpportunityResponseSchema),
    next: z.string().optional()
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
        let totalRecords = 0;

        // Fetch and validate only the first page before opening the delete-tracking window, so a
        // failure here never leaves LeverOpportunityNote's tracking started without a matching
        // end. Subsequent pages are streamed and processed immediately to keep memory bounded on
        // large accounts.
        const firstPage = await fetchOpportunityPage(nango, undefined);

        await nango.trackDeletesStart('LeverOpportunityNote');

        const processOpportunities = async (opportunities: z.infer<typeof LeverOpportunityResponseSchema>[]) => {
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
        };

        await processOpportunities(firstPage.data);
        let cursor = firstPage.next;
        while (cursor) {
            const page = await fetchOpportunityPage(nango, cursor);
            await processOpportunities(page.data);
            cursor = page.next;
        }

        await nango.trackDeletesEnd('LeverOpportunityNote');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function fetchOpportunityPage(nango: NangoSyncLocal, offset: string | undefined): Promise<z.infer<typeof OpportunityPageSchema>> {
    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#list-all-opportunities
        endpoint: '/v1/opportunities',
        params: {
            limit: String(LIMIT),
            ...(offset !== undefined && { offset })
        },
        retries: 3
    };
    const response = await nango.get(config);
    const parsed = OpportunityPageSchema.safeParse(response.data);
    if (!parsed.success) {
        throw new Error(`Lever opportunities response did not match expected schema: ${parsed.error.message}`);
    }
    return parsed.data;
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
