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

type Opportunity = z.infer<typeof OpportunitySchema>;

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

const sync = createSync({
    description: 'Fetches a list of all interview scheduling panels for every single opportunity',
    version: '1.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    models: {
        LeverOpportunityPanel: LeverOpportunityPanel
    },
    metadata: z.object({}),
    scopes: ['panels:read:admin'],
    exec: async (nango) => {
        let totalRecords = 0;

        // Fetch and validate only the first page before opening the delete-tracking window, so a
        // failure here never leaves LeverOpportunityPanel's tracking started without a matching
        // end. Subsequent pages are streamed and processed immediately to keep memory bounded on
        // large accounts.
        const firstPage = await fetchOpportunityPage(nango, undefined);

        await nango.trackDeletesStart('LeverOpportunityPanel');

        const processOpportunities = async (opportunities: Opportunity[]) => {
            for (const opportunity of opportunities) {
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
        };

        await processOpportunities(firstPage.data);
        let cursor = firstPage.next;
        while (cursor) {
            const page = await fetchOpportunityPage(nango, cursor);
            await processOpportunities(page.data);
            cursor = page.next;
        }

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
