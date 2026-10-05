import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        limit: z
            .number()
            .int()
            .min(1)
            .max(500)
            .optional()
            .describe('Maximum number of custom field definitions to return per page, between 1 and 500. Example: 50'),
        cursor: z.string().optional().describe('Opaque pagination cursor from the next_cursor field of a previous response. Omit to fetch the first page.')
    })
    .describe('Input for listing Constant Contact custom field definitions.');

const CustomFieldSchema = z.object({
    custom_field_id: z.string().describe('Unique ID of the custom field definition. Example: "a8210caa-bc34-11f1-8496-02420a320002"'),
    label: z.string().describe('Display label of the custom field. Example: "First pet name"'),
    name: z.string().describe('Machine-readable slug generated from the label. Example: "first_pet_name"'),
    type: z
        .string()
        .describe(
            'Data type of the custom field value, such as "string", "date", "datetime", "number", "boolean", "currency", "text_area", "single_select", or "multi_select".'
        ),
    version: z.number().int().optional().describe('Version number of the custom field definition.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the custom field was created. Example: "2026-09-29T18:36:17Z"'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the custom field was last updated. Example: "2026-09-29T18:36:17Z"')
});

const OutputSchema = z
    .object({
        custom_fields: z.array(CustomFieldSchema).describe('Custom field definitions contained in this page.'),
        next_cursor: z.string().optional().describe('Opaque cursor to pass as the cursor input to fetch the next page. Absent when there are no more pages.')
    })
    .describe('A page of Constant Contact custom field definitions.');

const ProviderResponseSchema = z.object({
    custom_fields: z.array(CustomFieldSchema),
    _links: z
        .object({
            next: z
                .object({
                    href: z.string()
                })
                .optional()
        })
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Only fetches custom field definitions from Constant Contact and never creates, updates, or deletes anything.
 * @pitfalls: Renaming a custom field's label regenerates its machine-readable name slug, so treat custom_field_id as the only stable identifier. List results can briefly lag recent creates or deletes, so a just-changed definition may not be reflected immediately. This action returns only a single page; pass the returned next_cursor back in as cursor to fetch subsequent pages.
 */
const action = createAction({
    description: 'List contact custom field definitions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html
            endpoint: '/v3/contact_custom_fields',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = ProviderResponseSchema.parse(response.data);

        let next_cursor: string | undefined;
        const nextHref = parsed._links?.next?.href;
        if (nextHref) {
            const queryStart = nextHref.indexOf('?');
            if (queryStart >= 0) {
                const cursorParam = new URLSearchParams(nextHref.slice(queryStart + 1)).get('cursor');
                if (cursorParam) {
                    next_cursor = cursorParam;
                }
            }
        }

        return {
            custom_fields: parsed.custom_fields,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
