import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
});

const CustomFieldLabelSchema = z.object({
    id: z.number().describe('Unique identifier. Example: 1'),
    created_at: z.string().optional().describe('Timestamp when the record was created (time zone in user\'s time zone). Example: "2020-02-07 15:26:10"'),
    updated_at: z.string().optional().describe('Timestamp when the record was last touched (time zone in user\'s time zone). Example: "2020-02-07 15:26:10"'),
    field_type: z.string().optional().describe('Type of custom field. Example: dropdown'),
    name: z.string().optional().describe('Name of the custom field. Example: My awesome custom field'),
    record_type: z.string().optional().describe('The type of record that association custom fields link to. Example: person'),
    is_required: z.boolean().optional().describe('Whether or not this custom field must be filled in. Example: false')
});

const PaginationSchema = z.object({
    page: z.number(),
    pages: z.number(),
    per_page: z.number(),
    total: z.number()
});

const ProviderListSchema = z.object({
    entries: z.array(CustomFieldLabelSchema),
    pagination: PaginationSchema.optional()
});

const OutputSchema = z.object({
    entries: z.array(CustomFieldLabelSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List individual custom field definitions available on people.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string'
            });
        }

        const config: ProxyConfiguration = {
            // https://app.pipelinecrm.com/openapi.yaml
            endpoint: '/api/v3/admin/person_custom_field_labels',
            params: {
                page: String(page)
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerList = ProviderListSchema.parse(response.data);

        const nextPage =
            providerList.pagination && providerList.pagination.page < providerList.pagination.pages ? String(providerList.pagination.page + 1) : undefined;

        return {
            entries: providerList.entries,
            ...(nextPage !== undefined && { next_cursor: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
