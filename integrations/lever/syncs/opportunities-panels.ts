import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LIMIT = 100;

const LeverOpportunityPanel = z.object({
    id: z.string(),
    applications: z.string().array().optional(),
    canceledAt: z.number().optional(),
    createdAt: z.number(),
    start: z.number().optional(),
    end: z.number().optional(),
    timezone: z.string(),
    feedbackReminder: z.string().optional(),
    user: z.string().optional(),
    stage: z.string().optional(),
    note: z.string().optional(),
    externallyManaged: z.boolean().optional(),
    externalUrl: z.string().optional(),
    interviews: z.array(z.unknown()).optional()
});

type LeverOpportunityPanel = z.infer<typeof LeverOpportunityPanel>;

const OpportunitySchema = z.object({
    id: z.string()
});

const OpportunityPageSchema = z.object({
    data: z.array(OpportunitySchema),
    next: z.string().optional()
});

interface PanelResponse {
    id: string;
    applications?: string[] | null;
    canceledAt?: number | null;
    createdAt: number;
    start?: number | null;
    end?: number | null;
    timezone: string;
    feedbackReminder?: string | null;
    user?: string | null;
    stage?: string | null;
    note?: string | null;
    externallyManaged?: boolean | null;
    externalUrl?: string | null;
    interviews?: unknown[] | null;
}

const CheckpointSchema = z.object({
    opportunityOffset: z.string()
});

const sync = createSync({
    description: 'Fetches a list of all interview scheduling panels for every single opportunity',
    version: '1.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        LeverOpportunityPanel: LeverOpportunityPanel
    },
    metadata: z.object({}),
    scopes: ['panels:read:admin'],
    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;

        let totalRecords = 0;
        let offset = checkpoint?.opportunityOffset;

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('LeverOpportunityPanel');

        while (true) {
            const page = await fetchOpportunityPage(nango, offset);

            for (const opportunity of page.data) {
                const config: ProxyConfiguration = {
                    // https://hire.lever.co/developer/documentation
                    endpoint: `/v1/opportunities/${encodeURIComponent(opportunity.id)}/panels`,
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
                for await (const panelBatch of nango.paginate(config)) {
                    const mappedPanels: LeverOpportunityPanel[] = panelBatch.map(mapPanel);
                    const batchSize = mappedPanels.length;
                    totalRecords += batchSize;
                    await nango.log(`Saving batch of ${batchSize} panel(s) for opportunity ${opportunity.id} (total panel(s): ${totalRecords})`);
                    await nango.batchSave(mappedPanels, 'LeverOpportunityPanel');
                }
            }

            offset = page.next;
            if (!offset) {
                break;
            }

            await nango.saveCheckpoint({ opportunityOffset: offset });
        }

        // Clear the checkpoint only after the last page has been saved, then close the
        // delete-tracking window opened by trackDeletesStart().
        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('LeverOpportunityPanel');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function fetchOpportunityPage(nango: NangoSyncLocal, offset: string | undefined): Promise<z.infer<typeof OpportunityPageSchema>> {
    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation
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

function mapPanel(panel: PanelResponse): LeverOpportunityPanel {
    return {
        id: panel.id,
        applications: panel.applications ?? undefined,
        canceledAt: panel.canceledAt ?? undefined,
        createdAt: panel.createdAt,
        start: panel.start ?? undefined,
        end: panel.end ?? undefined,
        timezone: panel.timezone,
        feedbackReminder: panel.feedbackReminder ?? undefined,
        user: panel.user ?? undefined,
        stage: panel.stage ?? undefined,
        note: panel.note ?? undefined,
        externallyManaged: panel.externallyManaged ?? undefined,
        externalUrl: panel.externalUrl ?? undefined,
        interviews: panel.interviews ?? undefined
    };
}
