import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (skip offset). Omit for the first page.')
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z.object({
                CurrentDivision: z.number()
            })
        )
    })
});

const VatCodeResultSchema = z.object({
    ID: z.string(),
    Code: z.string().optional().nullable(),
    Description: z.string().optional().nullable(),
    Modified: z.string().optional().nullable()
});

const VatCodesResponseSchema = z.object({
    d: z.array(VatCodeResultSchema)
});

const VatCodeOutputSchema = z.object({
    id: z.string(),
    code: z.string().optional(),
    description: z.string().optional(),
    modified: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(VatCodeOutputSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List VAT/tax codes.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-vat-codes'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const meResponse = await nango.get({
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        const division = meData.d.results[0]?.CurrentDivision;

        if (!division) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Could not determine current division from Me endpoint.'
            });
        }

        const pageSize = 50;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        if (Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Invalid cursor value.'
            });
        }

        const vatResponse = await nango.get({
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi
            endpoint: `/api/v1/${encodeURIComponent(division.toString())}/vat/VATCodes`,
            params: {
                $top: pageSize.toString(),
                $skip: skip.toString(),
                $orderby: 'Modified asc'
            },
            retries: 3
        });

        const vatData = VatCodesResponseSchema.parse(vatResponse.data);
        const items = vatData.d.map((item) => ({
            id: item.ID,
            ...(item.Code != null && { code: item.Code.trim() }),
            ...(item.Description != null && { description: item.Description }),
            ...(item.Modified != null && { modified: item.Modified })
        }));

        const nextCursor = vatData.d.length === pageSize ? (skip + pageSize).toString() : undefined;

        return {
            items,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
