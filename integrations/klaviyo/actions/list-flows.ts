import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const FlowAttributesSchema = z
    .object({
        name: z.string().optional(),
        status: z.string().optional(),
        trigger_type: z.string().optional(),
        created: z.string().optional(),
        updated: z.string().optional()
    })
    .passthrough();

const FlowSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        attributes: FlowAttributesSchema.optional(),
        links: z
            .object({
                self: z.string().optional()
            })
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    flows: z.array(FlowSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List flows.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://developers.klaviyo.com/en/reference/get_flows
        const response = await nango.get({
            endpoint: '/api/flows',
            params: {
                ...(input.cursor !== undefined && { 'page[cursor]': input.cursor })
            },
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const body = response.data;
        if (!body || typeof body !== 'object' || !Array.isArray(body.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Klaviyo API'
            });
        }

        const rawData: unknown[] = body.data;
        const flows = rawData.map((item) => {
            const parsed = FlowSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse flow item',
                    details: parsed.error.issues
                });
            }
            return parsed.data;
        });

        let next_cursor: string | undefined;
        if (body.links && typeof body.links === 'object' && 'next' in body.links && typeof body.links.next === 'string' && body.links.next) {
            const nextUrl = new URL(body.links.next);
            const cursor = nextUrl.searchParams.get('page[cursor]');
            if (cursor) {
                next_cursor = cursor;
            }
        }

        return {
            flows,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
