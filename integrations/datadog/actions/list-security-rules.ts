import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page_size: z.number().optional().describe('Number of items per page. Example: 20'),
    page_number: z.number().optional().describe('Page number starting at 0. Example: 0')
});

const ProviderRuleSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        attributes: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: z.array(ProviderRuleSchema).optional(),
    meta: z
        .object({
            page: z
                .object({
                    total_filtered_count: z.number().optional()
                })
                .optional()
        })
        .optional()
});

const OutputSchema = z.object({
    rules: z.array(ProviderRuleSchema),
    total_count: z.number().optional(),
    next_page_number: z.number().optional()
});

const action = createAction({
    description: 'List Cloud SIEM / Security Monitoring detection rules.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const isHttpError = (err: unknown): err is { status: number } => {
            return typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number';
        };

        // @allowTryCatch The entire Security Monitoring category returns 403 when Cloud SIEM is not activated on the tenant. Return an empty list in that case.
        try {
            const response = await nango.get({
                // https://docs.datadoghq.com/api/latest/security-monitoring/#list-detection-rules
                endpoint: 'v2/security_monitoring/rules',
                params: {
                    ...(input.page_size !== undefined && { 'page[size]': String(input.page_size) }),
                    ...(input.page_number !== undefined && { 'page[number]': String(input.page_number) })
                },
                retries: 3
            });

            const providerResponse = ProviderResponseSchema.parse(response.data);
            const rules = providerResponse.data ?? [];
            const totalCount = providerResponse.meta?.page?.total_filtered_count;

            let nextPageNumber: number | undefined;
            if (totalCount !== undefined && input.page_size !== undefined && input.page_number !== undefined) {
                const currentEnd = (input.page_number + 1) * input.page_size;
                if (currentEnd < totalCount) {
                    nextPageNumber = input.page_number + 1;
                }
            }

            return {
                rules,
                ...(totalCount !== undefined && { total_count: totalCount }),
                ...(nextPageNumber !== undefined && { next_page_number: nextPageNumber })
            };
        } catch (err) {
            if (isHttpError(err) && err.status === 403) {
                return { rules: [] };
            }
            throw err;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
