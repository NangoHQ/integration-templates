import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    lead_id: z.string().optional().describe('Filter by lead ID. Example: lead_mELh8FRqV6vRWJ5bgGdx7GpifIkEnoQFHg0hsxmQI1z'),
    status_id: z.string().optional().describe('Filter by opportunity status ID. Example: stat_YT79kszvqlYbs5HhEYBEtr0CkZ41Ey0RqXpLaUsr1li'),
    pipeline_id: z.string().optional().describe('Filter by pipeline ID. Example: pipe_4RR4Vuxbp8jRIcQEzEzcEJ'),
    date_updated__gt: z.string().optional().describe('Filter by update time greater than. Example: 2024-01-01T00:00:00.000000+00:00'),
    cursor: z.string().optional().describe('Pagination cursor (offset). Omit for the first page.'),
    limit: z.number().int().min(1).max(200).optional().describe('Page size. Max 200.')
});

const OpportunitySchema = z
    .object({
        id: z.string(),
        lead_id: z.string().nullish(),
        lead_name: z.string().nullish(),
        status_id: z.string().nullish(),
        status_label: z.string().nullish(),
        status_type: z.string().nullish(),
        status_display_name: z.string().nullish(),
        pipeline_id: z.string().nullish(),
        pipeline_name: z.string().nullish(),
        contact_id: z.string().nullish(),
        contact_name: z.string().nullish(),
        user_id: z.string().nullish(),
        user_name: z.string().nullish(),
        value: z.number().nullish(),
        value_period: z.string().nullish(),
        value_currency: z.string().nullish(),
        value_formatted: z.string().nullish(),
        annualized_value: z.number().nullish(),
        expected_value: z.number().nullish(),
        annualized_expected_value: z.number().nullish(),
        confidence: z.number().nullish(),
        note: z.string().nullish(),
        note_html: z.string().nullish(),
        date_created: z.string().nullish(),
        date_updated: z.string().nullish(),
        date_won: z.string().nullish(),
        date_lost: z.string().nullish(),
        organization_id: z.string().nullish(),
        created_by: z.string().nullish(),
        created_by_name: z.string().nullish(),
        updated_by: z.string().nullish(),
        updated_by_name: z.string().nullish(),
        is_stalled: z.boolean().nullish()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        data: z.array(z.unknown()),
        has_more: z.boolean(),
        total_results: z.number().optional(),
        count_by_value_period: z.record(z.string(), z.number()).optional(),
        total_value_one_time: z.number().optional(),
        total_value_monthly: z.number().optional(),
        total_value_annual: z.number().optional(),
        total_value_annualized: z.number().optional(),
        expected_value_one_time: z.number().optional(),
        expected_value_monthly: z.number().optional(),
        expected_value_annual: z.number().optional(),
        expected_value_annualized: z.number().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        data: z.array(OpportunitySchema),
        has_more: z.boolean().optional(),
        next_cursor: z.string().optional(),
        total_results: z.number().optional(),
        count_by_value_period: z.record(z.string(), z.number()).optional(),
        total_value_one_time: z.number().optional(),
        total_value_monthly: z.number().optional(),
        total_value_annual: z.number().optional(),
        total_value_annualized: z.number().optional(),
        expected_value_one_time: z.number().optional(),
        expected_value_monthly: z.number().optional(),
        expected_value_annual: z.number().optional(),
        expected_value_annualized: z.number().optional()
    })
    .passthrough();

const action = createAction({
    description: 'List opportunities with optional filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 200;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid integer string'
            });
        }

        const response = await nango.get({
            // https://developer.close.com/
            endpoint: '/v1/opportunity/',
            params: {
                ...(input.lead_id !== undefined && { lead_id: input.lead_id }),
                ...(input.status_id !== undefined && { status_id: input.status_id }),
                ...(input.pipeline_id !== undefined && { pipeline_id: input.pipeline_id }),
                ...(input.date_updated__gt !== undefined && { date_updated__gt: input.date_updated__gt }),
                _skip: String(skip),
                _limit: String(limit)
            },
            retries: 3
        });

        const raw = response.data;
        if (raw === null || raw === undefined || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Close API'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(raw);
        const opportunities = providerResponse.data.map((item) => OpportunitySchema.parse(item));
        const nextCursor = providerResponse.has_more ? String(skip + limit) : undefined;

        return {
            data: opportunities,
            has_more: providerResponse.has_more,
            next_cursor: nextCursor,
            total_results: providerResponse.total_results,
            count_by_value_period: providerResponse.count_by_value_period,
            total_value_one_time: providerResponse.total_value_one_time,
            total_value_monthly: providerResponse.total_value_monthly,
            total_value_annual: providerResponse.total_value_annual,
            total_value_annualized: providerResponse.total_value_annualized,
            expected_value_one_time: providerResponse.expected_value_one_time,
            expected_value_monthly: providerResponse.expected_value_monthly,
            expected_value_annual: providerResponse.expected_value_annual,
            expected_value_annualized: providerResponse.expected_value_annualized
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
