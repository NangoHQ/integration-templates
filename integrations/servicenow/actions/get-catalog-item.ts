import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('Service catalog item sys_id. Example: "04b7e94b4f7b4200086eeed18110c7fd"')
});

const ProviderCatalogItemSchema = z
    .object({
        sys_id: z.string(),
        name: z.string().optional().nullable(),
        short_description: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        picture: z.string().optional().nullable(),
        price: z.string().optional().nullable(),
        category: z.record(z.string(), z.unknown()).optional().nullable(),
        variables: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
        availability: z.string().optional().nullable(),
        request_method: z.string().optional().nullable()
    })
    .passthrough();

const OutputSchema = ProviderCatalogItemSchema;

const action = createAction({
    description: 'Retrieve a service catalog item.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.servicenow.com/dev.do#!/reference/api
        const response = await nango.get({
            endpoint: `/api/sn_sc/servicecatalog/items/${encodeURIComponent(input.sys_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Catalog item not found',
                sys_id: input.sys_id
            });
        }

        const ResponseWrapperSchema = z.object({
            result: z.unknown()
        });

        const parsedWrapper = ResponseWrapperSchema.safeParse(response.data);
        if (!parsedWrapper.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response structure from ServiceNow',
                sys_id: input.sys_id
            });
        }

        if (!parsedWrapper.data.result) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Catalog item not found',
                sys_id: input.sys_id
            });
        }

        const parsedItem = ProviderCatalogItemSchema.safeParse(parsedWrapper.data.result);
        if (!parsedItem.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse catalog item response',
                sys_id: input.sys_id,
                details: parsedItem.error.issues
            });
        }

        return parsedItem.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
