import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderCalendarEntryPrioritySchema = z.object({
    id: z.number(),
    name: z.string(),
    position: z.number().optional(),
    hex_color: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderPaginationSchema = z.object({
    page: z.number().optional(),
    pages: z.number().optional(),
    per_page: z.number().optional(),
    total: z.number().optional()
});

const ProviderResponseSchema = z.object({
    entries: z.array(ProviderCalendarEntryPrioritySchema),
    pagination: ProviderPaginationSchema.optional()
});

const OutputSchema = z.object({
    entries: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            position: z.number().optional(),
            hex_color: z.string().optional(),
            created_at: z.string().optional(),
            updated_at: z.string().optional()
        })
    ),
    pagination: z
        .object({
            page: z.number().optional(),
            pages: z.number().optional(),
            per_page: z.number().optional(),
            total: z.number().optional()
        })
        .optional()
});

const action = createAction({
    description: 'List priority levels that can be assigned to a calendar entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            // https://app.pipelinecrm.com/openapi.yaml
            endpoint: '/api/v3/admin/calendar_entry_priorities.json',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            entries: providerResponse.entries.map((entry) => ({
                id: entry.id,
                name: entry.name,
                ...(entry.position !== undefined && { position: entry.position }),
                ...(entry.hex_color !== undefined && { hex_color: entry.hex_color }),
                ...(entry.created_at !== undefined && { created_at: entry.created_at }),
                ...(entry.updated_at !== undefined && { updated_at: entry.updated_at })
            })),
            ...(providerResponse.pagination !== undefined && {
                pagination: providerResponse.pagination
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
