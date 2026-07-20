import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    location_id: z.string().describe('The ID of the location for which to list invoices. Example: "L6KAXMZ50WFKS"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(200).optional().describe('Maximum number of invoices to return (1-200). Defaults to 100.')
});

const InvoiceSchema = z
    .object({
        id: z.string(),
        version: z.number().int(),
        location_id: z.string(),
        status: z.string(),
        created_at: z.string(),
        updated_at: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    invoices: z.array(InvoiceSchema),
    cursor: z.string().optional()
});

const action = createAction({
    description: 'List invoices.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['INVOICES_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.squareup.com/reference/square/invoices-api/list-invoices
            endpoint: '/v2/invoices',
            params: {
                location_id: input.location_id,
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const body = z
            .object({
                invoices: z.array(z.unknown()).optional(),
                cursor: z.string().optional(),
                errors: z.array(z.unknown()).optional()
            })
            .parse(response.data);

        if (body.errors && body.errors.length > 0) {
            const firstError = z
                .object({
                    code: z.string().optional(),
                    detail: z.string().optional()
                })
                .parse(body.errors[0]);
            throw new nango.ActionError({
                type: 'api_error',
                message: firstError.detail || firstError.code || 'Square API returned an error',
                errors: body.errors
            });
        }

        const invoices = (body.invoices || []).map((item) => {
            return InvoiceSchema.parse(item);
        });

        return {
            invoices,
            ...(body.cursor !== undefined && { cursor: body.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
