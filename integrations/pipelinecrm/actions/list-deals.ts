import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().int().min(1).max(200).optional().describe('Number of deals per page. Maximum 200, default 200.')
});

const NestedIdNameSchema = z
    .object({
        id: z.number().nullish(),
        name: z.string().nullish()
    })
    .passthrough();

const PersonSummarySchema = z
    .object({
        id: z.number().nullish(),
        first_name: z.string().nullish(),
        last_name: z.string().nullish()
    })
    .passthrough();

const DealSchema = z
    .object({
        id: z.number(),
        name: z.string().nullish(),
        summary: z.string().nullish(),
        user_id: z.number().nullish(),
        status: z.number().nullish(),
        expected_close_date: z.string().nullish(),
        closed_time: z.string().nullish(),
        is_archived: z.boolean().nullish(),
        value: z.union([z.string(), z.number()]).nullish(),
        primary_contact_id: z.number().nullish(),
        person_ids: z.array(z.number()).nullish(),
        shared_user_ids: z.array(z.number()).nullish(),
        company_id: z.number().nullish(),
        company_name: z.string().nullish(),
        probability: z.number().nullish(),
        deal_stage_id: z.number().nullish(),
        deal_loss_reason_id: z.number().nullish(),
        deal_loss_reason_notes: z.string().nullish(),
        deal_won_reason_id: z.number().nullish(),
        deal_won_reason_notes: z.string().nullish(),
        source_id: z.number().nullish(),
        custom_fields: z.record(z.string(), z.unknown()).nullish(),
        tag_ids: z.array(z.number()).nullish(),
        address_1: z.string().nullish(),
        address_2: z.string().nullish(),
        city: z.string().nullish(),
        state: z.string().nullish(),
        postal_code: z.string().nullish(),
        country: z.string().nullish(),
        user: PersonSummarySchema.nullish(),
        import_id: z.number().nullish(),
        expected_close_date_event_id: z.number().nullish(),
        primary_contact: PersonSummarySchema.nullish(),
        people: z.array(PersonSummarySchema).nullish(),
        collaborators: z.array(PersonSummarySchema).nullish(),
        company: NestedIdNameSchema.nullish(),
        currency: z
            .object({
                code: z.string().nullish(),
                name: z.string().nullish(),
                symbol: z.string().nullish()
            })
            .passthrough()
            .nullish(),
        deal_stage: NestedIdNameSchema.nullish(),
        deal_loss_reason: NestedIdNameSchema.nullish(),
        source: NestedIdNameSchema.nullish(),
        possible_notify_user_ids: z.array(z.number()).nullish(),
        next_task_name: z.string().nullish(),
        next_task_id: z.number().nullish(),
        next_task_due: z.string().nullish(),
        next_task_all_day: z.boolean().nullish(),
        tags: z.array(NestedIdNameSchema).nullish(),
        created_at: z.string().nullish(),
        updated_at: z.string().nullish()
    })
    .passthrough();

const PaginationSchema = z.object({
    page: z.number(),
    page_var: z.string(),
    per_page: z.number(),
    pages: z.number(),
    total: z.number()
});

const ListResponseSchema = z.object({
    entries: z.array(DealSchema),
    pagination: PaginationSchema
});

const OutputSchema = z.object({
    items: z.array(DealSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List deals in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        const perPage = input.per_page ?? 200;

        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/deals',
            params: {
                page: String(page),
                per_page: String(perPage)
            },
            retries: 3
        });

        const data = ListResponseSchema.parse(response.data);
        const hasNextPage = data.pagination.page < data.pagination.pages;
        const nextCursor = hasNextPage ? String(data.pagination.page + 1) : undefined;

        return {
            items: data.entries,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
