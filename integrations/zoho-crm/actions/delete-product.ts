import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique ID of the product to delete. Example: "1234567890123456"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.string(),
    message: z.string().optional()
});

const ZohoDeleteResponseSchema = z.object({
    data: z.array(
        z.object({
            code: z.string(),
            details: z.record(z.string(), z.unknown()).optional(),
            message: z.string(),
            status: z.string()
        })
    )
});

const action = createAction({
    description: 'Delete or archive a product in Zoho CRM.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-product',
        group: 'Products'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.products.ALL', 'ZohoCRM.modules.products.WRITE', 'ZohoCRM.modules.products.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/Products/delete-products.html
        const response = await nango.delete({
            endpoint: `/crm/v2/Products/${input.id}`,
            retries: 10
        });

        const parsed = ZohoDeleteResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse Zoho CRM response',
                response: response.data
            });
        }

        const result = parsed.data.data[0];

        if (!result) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Zoho CRM returned empty response data',
                id: input.id
            });
        }

        if (result.status === 'error') {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: result.message,
                code: result.code,
                id: input.id
            });
        }

        return {
            success: result.status === 'success',
            id: input.id,
            ...(result.message !== undefined && { message: result.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
