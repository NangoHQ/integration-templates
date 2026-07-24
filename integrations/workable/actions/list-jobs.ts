import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from paging.next. Omit for the first page.'),
    state: z.string().optional().describe('Filter by job state. Example: "published", "closed", "archived".'),
    created_after: z.string().optional().describe('ISO 8601 timestamp. Return jobs created after this date.'),
    updated_after: z.string().optional().describe('ISO 8601 timestamp. Return jobs updated after this date.'),
    include_fields: z.string().optional().describe('Comma-separated extra fields. Example: "description,full_description,requirements,benefits".'),
    limit: z.number().max(100).optional().describe('Page size. Default 50, max 100.'),
    since_id: z.string().optional().describe('Return jobs with id greater than this value.'),
    max_id: z.string().optional().describe('Return jobs with id less than this value.')
});

const JobSchema = z
    .object({
        id: z.string(),
        title: z.string().optional(),
        shortcode: z.string().optional(),
        state: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        url: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    jobs: z.array(JobSchema),
    paging: z
        .object({
            next: z.string().nullable().optional(),
            count: z.number().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(JobSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List account jobs with optional state/date filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_jobs'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const endpoint = '/spi/v3/jobs';
        const params: Record<string, string | number> = input.cursor
            ? Object.fromEntries(new URL(input.cursor).searchParams.entries())
            : {
                  ...(input.state !== undefined ? { state: input.state } : {}),
                  ...(input.created_after !== undefined ? { created_after: input.created_after } : {}),
                  ...(input.updated_after !== undefined ? { updated_after: input.updated_after } : {}),
                  ...(input.include_fields !== undefined ? { include_fields: input.include_fields } : {}),
                  ...(input.limit !== undefined ? { limit: input.limit } : {}),
                  ...(input.since_id !== undefined ? { since_id: input.since_id } : {}),
                  ...(input.max_id !== undefined ? { max_id: input.max_id } : {})
              };

        const response = await nango.get({
            // https://workable.readme.io/reference/list-jobs
            endpoint,
            params,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            items: providerData.jobs,
            ...(providerData.paging?.next ? { next_cursor: providerData.paging.next } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
