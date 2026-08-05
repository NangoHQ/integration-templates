import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    service_account_id: z.string().trim().min(1).describe('The ID of the service account. Example: "39886536-8f56-11f1-88dd-3619de0c3ef9"'),
    page_size: z.number().int().min(1).max(100).optional().describe('Number of items per page. Maximum 100.'),
    page_number: z.number().int().min(0).optional().describe('Page number for offset-based pagination.'),
    sort: z.string().optional().describe('Sort order. Examples: "created_at", "-created_at", "name", "-name".')
});

const ApplicationKeyAttributesSchema = z
    .object({
        created_at: z.string().optional(),
        last4: z.string().optional(),
        name: z.string().optional(),
        scopes: z.array(z.string()).optional()
    })
    .passthrough();

const ApplicationKeySchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: ApplicationKeyAttributesSchema.optional()
});

const MetaPageSchema = z
    .object({
        total_count: z.number().optional(),
        total_filtered_count: z.number().optional()
    })
    .optional();

const MetaSchema = z
    .object({
        page: MetaPageSchema
    })
    .optional();

const OutputSchema = z.object({
    data: z.array(ApplicationKeySchema),
    meta: MetaSchema
});

const action = createAction({
    description: 'List application keys owned by a service account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.page_size !== undefined) {
            params['page[size]'] = input.page_size;
        }
        if (input.page_number !== undefined) {
            params['page[number]'] = input.page_number;
        }
        if (input.sort !== undefined) {
            params['sort'] = input.sort;
        }

        // https://docs.datadoghq.com/api/latest/service-accounts/
        const response = await nango.get({
            endpoint: `v2/service_accounts/${encodeURIComponent(input.service_account_id)}/application_keys`,
            params,
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(z.unknown()).default([]),
                meta: z.unknown().optional()
            })
            .parse(response.data);

        const keys = providerResponse.data.map((item: unknown) => {
            const raw = z
                .object({
                    id: z.string(),
                    type: z.string(),
                    attributes: z.object({}).passthrough().nullable().optional()
                })
                .parse(item);

            if (raw.attributes == null) {
                return {
                    id: raw.id,
                    type: raw.type
                };
            }

            const cleaned: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(raw.attributes)) {
                if (value !== null && value !== undefined) {
                    cleaned[key] = value;
                }
            }

            return {
                id: raw.id,
                type: raw.type,
                attributes: cleaned
            };
        });

        const meta = MetaSchema.safeParse(providerResponse.meta);

        return {
            data: keys,
            ...(meta.success && meta.data !== undefined && { meta: meta.data })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
