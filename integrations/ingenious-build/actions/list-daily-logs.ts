import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('Project ID to filter daily logs by. Example: "6a71de59f55241acad0cd44e"'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().optional().describe('Number of items per page.'),
    status: z.enum(['draft', 'submitted', 'approved']).optional().describe('Filter by daily log status.'),
    date_after: z.string().optional().describe('Filter by date after (Y-m-d).'),
    date_before: z.string().optional().describe('Filter by date before (Y-m-d).')
});

const DailyLogItemSchema = z
    .object({
        id: z.string(),
        project_id: z.string(),
        status: z.string(),
        date: z.string(),
        reported_by_id: z.string(),
        responsible_contractor_id: z.string(),
        total_hours: z.number().nullish(),
        total_delay_hours: z.number().nullish(),
        person_count: z.number().nullish(),
        safety_incidents_count: z.number().optional(),
        safety_violations_count: z.number().optional(),
        created_at: z.string(),
        updated_at: z.string(),
        delays: z.unknown().nullish(),
        safety_incidents: z.unknown().nullish(),
        safety_violations: z.unknown().nullish(),
        equipment: z.unknown().nullish(),
        visitors: z.unknown().nullish(),
        notes: z.unknown().nullish(),
        weather: z.unknown().nullish(),
        work_log: z.unknown().nullish(),
        waste: z.unknown().nullish(),
        manpower: z.unknown().nullish(),
        subcontractor_manpower: z.unknown().nullish(),
        productivity: z.unknown().nullish(),
        waste_v1: z.unknown().nullish()
    })
    .passthrough();

const ListResponseSchema = z.object({
    items: z.array(z.unknown()),
    total: z.number(),
    page: z.number().nullish(),
    per_page: z.number().nullish(),
    first_page_url: z.string().nullish(),
    last_page_url: z.string().nullish(),
    next_page_url: z.string().nullish(),
    prev_page_url: z.string().nullish()
});

const OutputSchema = z.object({
    items: z.array(DailyLogItemSchema),
    next_page: z.string().optional()
});

function extractNextPage(nextPageUrl: string | null | undefined): string | undefined {
    if (!nextPageUrl) {
        return undefined;
    }
    // @allowTryCatch next_page_url comes from the provider and may be malformed; swallow parse errors and treat as no next page.
    try {
        const url = new URL(nextPageUrl);
        const page = url.searchParams.get('page');
        if (page) {
            return page;
        }
    } catch {
        return undefined;
    }
    return undefined;
}

const action = createAction({
    description: 'List daily field logs for a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            project_id: input.project_id
        };

        if (input.cursor) {
            const page = parseInt(input.cursor, 10);
            if (!Number.isNaN(page)) {
                params['page'] = page;
            }
        }

        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }

        if (input.status !== undefined) {
            params['status'] = input.status;
        }

        if (input.date_after !== undefined) {
            params['date_after'] = input.date_after;
        }

        if (input.date_before !== undefined) {
            params['date_before'] = input.date_before;
        }

        // https://api.ingenious.build/reference/v2-list-daily-logs.md
        const response = await nango.get({
            endpoint: '/api/v2/pub/daily-logs',
            params,
            retries: 3
        });

        const listResponse = ListResponseSchema.parse(response.data);

        const items = listResponse.items.map((item: unknown) => DailyLogItemSchema.parse(item));

        return {
            items,
            next_page: extractNextPage(listResponse.next_page_url)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
