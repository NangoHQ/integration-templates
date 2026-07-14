import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('Service catalog item sys_id. Example: "04b7e94b4f7b4200086eeed18110c7fd"')
});

const ProviderCatalogItemSchema = z
    .object({
        sys_id: z.string(),
        name: z.string().optional(),
        short_description: z.string().optional(),
        description: z.string().optional(),
        picture: z.string().optional(),
        price: z.string().optional(),
        category: z.record(z.string(), z.unknown()).optional(),
        variables: z.array(z.record(z.string(), z.unknown())).optional(),
        availability: z.string().optional(),
        request_method: z.string().optional()
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

        const ResponseWrapperSchema = z.object({
            result: z.unknown()
        });

        const parsedWrapper = ResponseWrapperSchema.safeParse(response.data);
        if (!parsedWrapper.success || !parsedWrapper.data.result) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Catalog item not found',
                sys_id: input.sys_id
            });
        }

        const providerItem = ProviderCatalogItemSchema.parse(parsedWrapper.data.result);

        return providerItem;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
