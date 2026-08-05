import { z } from 'zod';
import { createAction } from 'nango';

const ProviderDocumentTagSchema = z
    .object({
        id: z.number(),
        name: z.string()
    })
    .passthrough();

const PaginationSchema = z.object({
    page: z.number().optional().nullable(),
    page_var: z.string().optional().nullable(),
    per_page: z.number().optional().nullable(),
    pages: z.number().optional().nullable(),
    total: z.number().optional().nullable()
});

const OutputSchema = z.object({
    entries: z.array(ProviderDocumentTagSchema),
    pagination: PaginationSchema.optional().nullable()
});

const action = createAction({
    description: 'List tags available for tagging documents/files.',
    version: '1.0.0',
    input: z.object({}),
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: 'api/v3/admin/document_tags',
            retries: 3
        });

        const parsed = z
            .object({
                entries: z.array(ProviderDocumentTagSchema).default([]),
                pagination: PaginationSchema.optional().nullable()
            })
            .parse(response.data);

        return {
            entries: parsed.entries,
            ...(parsed.pagination !== undefined && { pagination: parsed.pagination })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
