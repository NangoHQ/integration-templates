import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start: z
        .string()
        .describe('Datetime in ISO-8601 format, UTC, precise to hour: [YYYY-MM-DDThh] for usage beginning at this hour. Example: "2026-04-17T12:00:00Z"'),
    product_families: z.string().describe('Comma separated list of product families to retrieve. Example: "infra_hosts"'),
    end: z.string().optional().describe('Datetime in ISO-8601 format, UTC, precise to hour: [YYYY-MM-DDThh] for usage ending before this hour.'),
    include_descendants: z.boolean().optional().describe('Include child org usage in the response. Defaults to false.'),
    cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from the previous response. To make the next request, use the same parameters and add `next_record_id`.')
});

const HourlyUsageMeasurementSchema = z.object({
    usage_type: z.string(),
    value: z.number().nullable().optional()
});

const HourlyUsageAttributesSchema = z.object({
    account_name: z.string().optional(),
    account_public_id: z.string().optional(),
    measurements: z.array(HourlyUsageMeasurementSchema).optional(),
    org_name: z.string().optional(),
    product_family: z.string().optional(),
    public_id: z.string().optional(),
    region: z.string().optional(),
    timestamp: z.string().optional()
});

const HourlyUsageSchema = z.object({
    attributes: HourlyUsageAttributesSchema.optional(),
    id: z.string(),
    type: z.string().optional()
});

const HourlyUsagePaginationSchema = z.object({
    next_record_id: z.string().nullable().optional()
});

const HourlyUsageMetadataSchema = z.object({
    pagination: HourlyUsagePaginationSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(HourlyUsageSchema),
    meta: HourlyUsageMetadataSchema.optional()
});

const OutputSchema = z.object({
    data: z.array(HourlyUsageSchema),
    next_record_id: z.string().optional()
});

const action = createAction({
    description:
        'Get hourly usage broken down by product family — the current recommended usage endpoint (most per-product v1 hourly endpoints are deprecated in favor of this one).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['usage_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.datadoghq.com/api/latest/usage-metering/#get-hourly-usage-by-product-family
        const response = await nango.get({
            endpoint: 'v2/usage/hourly_usage',
            params: {
                'filter[timestamp][start]': input.start,
                'filter[product_families]': input.product_families,
                ...(input.end !== undefined && { 'filter[timestamp][end]': input.end }),
                ...(input.include_descendants !== undefined && { 'filter[include_descendants]': String(input.include_descendants) }),
                ...(input.cursor !== undefined && { 'page[next_record_id]': input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            data: providerResponse.data,
            ...(providerResponse.meta?.pagination?.next_record_id != null && {
                next_record_id: providerResponse.meta.pagination.next_record_id
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
