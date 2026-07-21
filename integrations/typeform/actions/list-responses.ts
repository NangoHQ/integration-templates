import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    form_id: z.string().describe('Form ID. Example: "WMpBq4vc"'),
    page_size: z.number().max(1000).optional().describe('Number of responses per page. Default 25, max 1000.'),
    since: z.string().optional().describe('Include responses submitted on or after this timestamp (ISO 8601 or unix).'),
    until: z.string().optional().describe('Include responses submitted on or before this timestamp (ISO 8601 or unix).'),
    after: z.string().optional().describe('Include responses submitted after this response token (exclusive).'),
    included_response_ids: z.string().optional().describe('Comma-separated response IDs to include.'),
    excluded_response_ids: z.string().optional().describe('Comma-separated response IDs to exclude.'),
    response_type: z.string().optional().describe('Types to include: started, partial, completed. Defaults to completed only.'),
    sort: z.string().optional().describe('Sort order: {field_id},{asc|desc}. Cannot be combined with after/before/cursor.'),
    query: z.string().optional().describe('Free-text search across answers.'),
    fields: z.string().optional().describe('Comma-separated field IDs to include in answers.'),
    answered_fields: z.string().optional().describe('Comma-separated field IDs that must have answers.'),
    cursor: z.string().optional().describe('Pagination cursor from a previous response. Maps to the before parameter.')
});

const FieldSchema = z.object({
    id: z.string(),
    ref: z.string().optional(),
    type: z.string()
});

const AnswerSchema = z
    .object({
        field: FieldSchema,
        type: z.string()
    })
    .passthrough();

const VariableSchema = z
    .object({
        key: z.string(),
        type: z.string()
    })
    .passthrough();

const ResponseItemSchema = z
    .object({
        landing_id: z.string(),
        token: z.string(),
        response_id: z.string().optional(),
        landed_at: z.string(),
        submitted_at: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        answers: z.array(AnswerSchema).optional(),
        hidden: z.record(z.string(), z.unknown()).optional(),
        calculated: z.record(z.string(), z.unknown()).optional(),
        variables: z.array(VariableSchema).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    total_items: z.number(),
    page_count: z.number(),
    items: z.array(ResponseItemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List form responses.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['responses:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const pageSize = input.page_size ?? 25;

        const response = await nango.get({
            // https://www.typeform.com/developers/responses/reference/retrieve-responses/
            endpoint: `/forms/${encodeURIComponent(input.form_id)}/responses`,
            params: {
                page_size: pageSize,
                ...(input.since !== undefined && { since: input.since }),
                ...(input.until !== undefined && { until: input.until }),
                ...(input.after !== undefined && { after: input.after }),
                ...(input.cursor !== undefined && { before: input.cursor }),
                ...(input.included_response_ids !== undefined && { included_response_ids: input.included_response_ids }),
                ...(input.excluded_response_ids !== undefined && { excluded_response_ids: input.excluded_response_ids }),
                ...(input.response_type !== undefined && { response_type: input.response_type }),
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.query !== undefined && { query: input.query }),
                ...(input.fields !== undefined && { fields: input.fields }),
                ...(input.answered_fields !== undefined && { answered_fields: input.answered_fields })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                total_items: z.number(),
                page_count: z.number(),
                items: z.array(z.unknown())
            })
            .parse(response.data);

        const items = providerResponse.items.map((item) => ResponseItemSchema.parse(item));

        const nextCursor = items.length === pageSize ? items[items.length - 1]?.token : undefined;

        return {
            total_items: providerResponse.total_items,
            page_count: providerResponse.page_count,
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
