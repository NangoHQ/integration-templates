import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        limit: z.number().int().min(1).optional().describe('Maximum number of forms to return per page. Jotform defaults to 20 when omitted. Example: 20'),
        offset: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe('Zero-based index of the first form to return. Combine with limit to page through results. Defaults to 0. Example: 40'),
        orderby: z
            .enum(['id', 'title', 'status', 'created_at', 'updated_at', 'count', 'slug'])
            .optional()
            .describe('Form field to order results by. Jotform orders by id when omitted. Example: "created_at"'),
        direction: z.enum(['ASC', 'DESC']).optional().describe('Sort direction applied to orderby. Ignored when orderby is omitted. Example: "DESC"'),
        status: z
            .enum(['ENABLED', 'DELETED'])
            .optional()
            .describe('Only return forms in this status. When omitted, forms in every status (including deleted forms) are returned. Example: "ENABLED"')
    })
    .describe('Pagination, sorting, and filtering options for listing forms');

const FormSchema = z
    .object({
        id: z.string().describe('Unique form ID. Example: "262715780901055"'),
        title: z.string().describe('Form title. Example: "Feature Showcase Form"'),
        status: z.string().describe('Form status, e.g. "ENABLED" or "DELETED". Example: "ENABLED"'),
        url: z.string().describe('Public URL of the form. Example: "https://form.jotform.com/262715780901055"'),
        count: z.string().describe('Number of submissions the form has received, returned as a numeric string. Example: "3"'),
        created_at: z.string().describe('Creation timestamp in "YYYY-MM-DD HH:mm:ss" format. Example: "2026-09-29 14:56:35"'),
        updated_at: z.string().describe('Last modification timestamp in "YYYY-MM-DD HH:mm:ss" format. Example: "2026-09-29 14:59:19"'),
        last_submission: z
            .string()
            .optional()
            .describe(
                'Timestamp of the most recent submission in "YYYY-MM-DD HH:mm:ss" format. Omitted when the form has no submissions. Example: "2026-09-30 12:35:12"'
            )
    })
    .describe('A single Jotform form');

const OutputSchema = z
    .object({
        forms: z.array(FormSchema).describe('Forms owned by the authenticated user for the requested page'),
        count: z.number().int().describe('Total number of forms matching the request across all pages. Example: 2'),
        offset: z.number().int().describe('Zero-based index of the first returned form, echoing the request. Example: 0'),
        limit: z.number().int().describe('Page size that was applied to the request. Example: 20')
    })
    .describe('A page of forms with pagination details');

const JotformFormSchema = z.object({
    id: z.string(),
    title: z.string(),
    status: z.string(),
    url: z.string(),
    count: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    last_submission: z.string().nullable().optional()
});

const JotformListFormsResponseSchema = z.object({
    responseCode: z.number(),
    content: z.array(JotformFormSchema),
    resultSet: z
        .object({
            offset: z.number(),
            limit: z.number(),
            count: z.number()
        })
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Only calls the read-only Jotform endpoint that lists the authenticated user's forms.
 * @pitfalls: Deleted forms are included in results by default; pass status ENABLED to exclude them. Jotform enforces daily API request limits per plan (1,000 calls/day on free plans), so frequent polling can exhaust the quota.
 */
const action = createAction({
    description: 'List forms owned by the authenticated user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const orderby = input.orderby === undefined ? undefined : input.direction === undefined ? input.orderby : `${input.orderby} ${input.direction}`;

        const config: ProxyConfiguration = {
            // https://api.jotform.com/docs/#user-forms
            endpoint: '/user/forms',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.offset !== undefined && { offset: input.offset }),
                ...(orderby !== undefined && { orderby }),
                ...(input.status !== undefined && { filter: JSON.stringify({ status: input.status }) })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = JotformListFormsResponseSchema.parse(response.data);

        return {
            forms: parsed.content.map((form) => ({
                id: form.id,
                title: form.title,
                status: form.status,
                url: form.url,
                count: form.count,
                created_at: form.created_at,
                updated_at: form.updated_at,
                ...(form.last_submission != null && { last_submission: form.last_submission })
            })),
            count: parsed.resultSet?.count ?? parsed.content.length,
            offset: parsed.resultSet?.offset ?? 0,
            limit: parsed.resultSet?.limit ?? parsed.content.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
