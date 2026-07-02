import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(100).optional().describe('Number of results per page. Defaults to 20.')
});

const FormAttributesSchema = z
    .object({
        ab_test: z.boolean().optional().nullable(),
        created_at: z.string().optional().nullable(),
        name: z.string().optional().nullable(),
        status: z.string().optional().nullable(),
        updated_at: z.string().optional().nullable()
    })
    .passthrough();

const FormSchema = z
    .object({
        type: z.string(),
        id: z.string(),
        attributes: FormAttributesSchema.optional(),
        relationships: z.record(z.string(), z.unknown()).optional(),
        links: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        data: z.array(FormSchema),
        links: z
            .object({
                next: z.string().optional().nullable(),
                prev: z.string().optional().nullable(),
                self: z.string().optional().nullable()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(FormSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List forms.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['forms:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.cursor) {
            params['page[cursor]'] = input.cursor;
        }
        if (input.page_size !== undefined) {
            params['page[size]'] = input.page_size;
        }

        const response = await nango.get({
            // https://developers.klaviyo.com/en/reference/get_forms
            endpoint: '/api/forms',
            params,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const body = ProviderResponseSchema.parse(response.data);

        let nextCursor: string | undefined;
        if (body.links?.next) {
            const nextUrl = new URL(body.links.next);
            const cursor = nextUrl.searchParams.get('page[cursor]');
            if (cursor) {
                nextCursor = cursor;
            }
        }

        return {
            items: body.data,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
