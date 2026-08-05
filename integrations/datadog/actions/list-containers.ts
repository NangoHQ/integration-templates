import { z } from 'zod';
import { createAction } from 'nango';

const ContainerAttributesSchema = z
    .object({
        container_id: z.string().optional(),
        created_at: z.string().optional(),
        host: z.string().optional(),
        image_name: z.string().optional(),
        image_id: z.string().optional(),
        name: z.string().optional(),
        status: z.string().optional(),
        tags: z.array(z.string()).optional()
    })
    .passthrough();

const ContainerItemSchema = z
    .object({
        id: z.string().optional(),
        type: z.string().optional(),
        attributes: ContainerAttributesSchema.optional()
    })
    .passthrough();

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    filter_tags: z.string().optional().describe('Comma-separated list of tags to filter containers by.'),
    group_by: z.string().optional().describe('Comma-separated list of tags to group containers by.'),
    sort: z.string().optional().describe('Attribute to sort containers by.'),
    page_size: z.number().optional().describe('Maximum number of results returned.')
});

const ProviderResponseSchema = z.object({
    data: z.array(ContainerItemSchema),
    meta: z
        .object({
            pagination: z
                .object({
                    cursor: z.string().optional(),
                    next_cursor: z.string().nullable().optional(),
                    previous_cursor: z.string().nullable().optional(),
                    type: z.string().optional(),
                    total: z.number().optional(),
                    size: z.number().optional()
                })
                .optional()
        })
        .optional(),
    links: z
        .object({
            self: z.string().nullable().optional(),
            next: z.string().nullable().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(ContainerItemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List containers reported by hosts running the Datadog Agent.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/containers/
            endpoint: 'v2/containers',
            params: {
                ...(input.cursor !== undefined && { 'page[cursor]': input.cursor }),
                ...(input.filter_tags !== undefined && { 'filter[tags]': input.filter_tags }),
                ...(input.group_by !== undefined && { group_by: input.group_by }),
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.page_size !== undefined && { 'page[size]': String(input.page_size) })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: parsed.data,
            ...(parsed.meta?.pagination?.next_cursor != null && { next_cursor: parsed.meta.pagination.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
