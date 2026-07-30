import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe("Company / legal entity ID. Example: 'dat'"),
    itemNumber: z.string().describe("Released product item number. May include leading or trailing whitespace. Example: ' RFI-TEST-001'")
});

const OutputSchema = z
    .object({
        dataAreaId: z.string(),
        ItemNumber: z.string()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a released product',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedDataAreaId = encodeURIComponent(input.dataAreaId.replace(/'/g, "''"));
        const encodedItemNumber = encodeURIComponent(input.itemNumber.replace(/'/g, "''"));

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: `/data/ReleasedProductsV2(dataAreaId='${encodedDataAreaId}',ItemNumber='${encodedItemNumber}')`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Released product not found',
                dataAreaId: input.dataAreaId,
                itemNumber: input.itemNumber
            });
        }

        const providerProduct = z
            .object({
                dataAreaId: z.string().optional(),
                ItemNumber: z.string().optional()
            })
            .passthrough()
            .parse(response.data);

        return {
            ...providerProduct,
            dataAreaId: providerProduct.dataAreaId ?? input.dataAreaId,
            ItemNumber: providerProduct.ItemNumber ?? input.itemNumber
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
