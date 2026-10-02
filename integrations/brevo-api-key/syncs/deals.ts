import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DealSchema = z
    .object({
        id: z.string().describe('Unique Brevo deal ID (24-character hex string). Example: "629475917295261d9b1f4403"'),
        deal_name: z.string().optional().describe('Name of the deal. Example: "Acme renewal"'),
        deal_owner: z.string().optional().describe('Brevo account ID or email of the user who owns the deal.'),
        deal_stage: z
            .string()
            .optional()
            .describe('ID of the deal stage within its pipeline. Readable on every deal record but not settable via the deals API.'),
        pipeline: z.string().optional().describe('ID of the pipeline the deal belongs to. Readable on every deal record but not settable via the deals API.'),
        amount: z.number().optional().describe('Monetary amount associated with the deal.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp of when the deal was created. Example: "2022-05-30T07:42:05.671Z"'),
        last_updated_date: z.string().optional().describe('ISO 8601 timestamp of the last update to the deal.'),
        stage_updated_at: z.string().optional().describe('ISO 8601 timestamp of the last stage change for the deal.'),
        last_activity_date: z.string().optional().describe('ISO 8601 timestamp of the last activity logged on the deal.'),
        number_of_contacts: z.number().optional().describe('Number of contacts linked to the deal.'),
        number_of_activities: z.number().optional().describe('Number of activities logged on the deal.'),
        linkedContactsIds: z.array(z.number()).optional().describe('Numeric IDs of the Brevo contacts linked to this deal.'),
        linkedCompaniesIds: z.array(z.string()).optional().describe('IDs (24-character hex strings) of the Brevo companies linked to this deal.')
    })
    .describe('Brevo CRM deal (opportunity) record');

// Internal schema for the raw GET /crm/deals response. Unknown keys (custom deal
// attributes, undocumented top-level fields) are stripped by the parse.
const DealApiSchema = z.object({
    id: z.string(),
    attributes: z
        .object({
            deal_name: z.string().optional(),
            deal_owner: z.string().optional(),
            deal_stage: z.string().optional(),
            pipeline: z.string().optional(),
            amount: z.number().optional(),
            created_at: z.string().optional(),
            last_updated_date: z.string().optional(),
            stage_updated_at: z.string().optional(),
            last_activity_date: z.string().optional(),
            number_of_contacts: z.number().optional(),
            number_of_activities: z.number().optional()
        })
        .optional(),
    linkedContactsIds: z.array(z.number()).optional(),
    linkedCompaniesIds: z.array(z.string()).optional()
});

// Checkpoint fields must be plain ZodString/ZodNumber per the Nango SDK's
// ZodCheckpoint constraint; "no checkpoint yet" is represented by a null
// checkpoint rather than by absent fields.
const CheckpointSchema = z.object({
    modified_since: z.string(),
    runs_since_full: z.number().int()
});

// A modifiedSince-only crawl can never observe deletions, so every Nth run
// crawls the full deal list inside a delete-tracking window instead.
const FULL_REFRESH_INTERVAL = 24;

const sync = createSync({
    description: 'Sync Brevo CRM deals, incrementally via the modifiedSince filter with a periodic full refresh to detect deletions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Deal: DealSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const modifiedSince = checkpoint?.modified_since;
        const runsSinceFull = checkpoint?.runs_since_full ?? FULL_REFRESH_INTERVAL;
        // Full refresh on the first run (no checkpoint) and every FULL_REFRESH_INTERVAL
        // runs afterwards. A full crawl must not pass modifiedSince: unchanged deals
        // would be absent from the run and trackDeletesEnd would falsely mark them deleted.
        const isFullRefresh = checkpoint === null || runsSinceFull >= FULL_REFRESH_INTERVAL;

        if (isFullRefresh) {
            await nango.trackDeletesStart('Deal');
        }

        let maxModifiedAt = modifiedSince;

        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/get-all-deals
            endpoint: '/crm/deals',
            params: {
                ...(!isFullRefresh && modifiedSince !== undefined ? { modifiedSince } : {})
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'items'
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(config)) {
            const deals = page.map((raw) => {
                // Throw (rather than skip) on an unexpected record shape: inside a
                // delete-tracked crawl a skipped record would be falsely marked deleted.
                const deal = DealApiSchema.parse(raw);
                const attributes = deal.attributes ?? {};
                return {
                    id: deal.id,
                    deal_name: attributes.deal_name,
                    deal_owner: attributes.deal_owner,
                    deal_stage: attributes.deal_stage,
                    pipeline: attributes.pipeline,
                    amount: attributes.amount,
                    created_at: attributes.created_at,
                    last_updated_date: attributes.last_updated_date,
                    stage_updated_at: attributes.stage_updated_at,
                    last_activity_date: attributes.last_activity_date,
                    number_of_contacts: attributes.number_of_contacts,
                    number_of_activities: attributes.number_of_activities,
                    linkedContactsIds: deal.linkedContactsIds,
                    linkedCompaniesIds: deal.linkedCompaniesIds
                };
            });

            for (const deal of deals) {
                if (
                    deal.last_updated_date !== undefined &&
                    (maxModifiedAt === undefined || Date.parse(deal.last_updated_date) > Date.parse(maxModifiedAt))
                ) {
                    maxModifiedAt = deal.last_updated_date;
                }
            }

            if (deals.length > 0) {
                await nango.batchSave(deals, 'Deal');
            }
        }

        if (isFullRefresh) {
            // Persist progress only once the full scan completes: a mid-scan checkpoint
            // would make a crashed run look like a plain incremental run on retry and
            // silently skip delete tracking. Close the delete window before saving the
            // checkpoint so a crash in between forces another full refresh next time.
            await nango.trackDeletesEnd('Deal');
            if (maxModifiedAt !== undefined) {
                await nango.saveCheckpoint({ modified_since: maxModifiedAt, runs_since_full: 0 });
            }
        } else if (maxModifiedAt !== undefined) {
            // Save the incremental checkpoint only after the crawl finishes. Advancing it
            // mid-run risks skipping later pages if the sync crashes before completion.
            await nango.saveCheckpoint({
                modified_since: maxModifiedAt,
                runs_since_full: runsSinceFull + 1
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
