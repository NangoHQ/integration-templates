import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    record_id: z.string().describe('The unique ID of the product record to retrieve. Example: "4150868000000236379"')
});

// Zoho CRM returns snake_case fields as documented at https://www.zoho.com/crm/developer/docs/api/v2/products-response.html
const OwnerSchema = z.object({
    name: z.string().optional(),
    id: z.string().optional(),
    email: z.string().optional()
});

const VendorNameSchema = z.object({
    name: z.string().optional(),
    id: z.string().optional()
});

// Using nullish for fields that can be null or omitted per Zoho CRM API
const ProviderProductSchema = z.object({
    id: z.string(),
    Product_Name: z.string().optional(),
    Product_Code: z.string().nullish(),
    Owner: OwnerSchema.nullish(),
    Product_Category: z.string().nullish(),
    Unit_Price: z.number().nullish(),
    Qty_in_Stock: z.number().nullish(),
    Qty_in_Demand: z.number().nullish(),
    Qty_Ordered: z.number().nullish(),
    Sales_Start_Date: z.string().nullish(),
    Sales_End_Date: z.string().nullish(),
    Support_Start_Date: z.string().nullish(),
    Support_Expiry_Date: z.string().nullish(),
    Description: z.string().nullish(),
    Taxable: z.boolean().nullish(),
    Product_Active: z.boolean().nullish(),
    Vendor_Name: VendorNameSchema.nullish(),
    Created_By: OwnerSchema.nullish(),
    Modified_By: OwnerSchema.nullish(),
    Created_Time: z.string().nullish(),
    Modified_Time: z.string().nullish(),
    Usage_Unit: z.string().nullish(),
    Tax: z.array(z.string()).nullish(),
    Reorder_Level: z.number().nullish(),
    $currency_symbol: z.string().nullish(),
    $editable: z.boolean().nullish(),
    $taxable: z.boolean().nullish()
});

const OutputSchema = z.object({
    id: z.string(),
    Product_Name: z.string().optional(),
    Product_Code: z.string().nullish(),
    Owner: OwnerSchema.nullish(),
    Product_Category: z.string().nullish(),
    Unit_Price: z.number().nullish(),
    Qty_in_Stock: z.number().nullish(),
    Qty_in_Demand: z.number().nullish(),
    Qty_Ordered: z.number().nullish(),
    Sales_Start_Date: z.string().nullish(),
    Sales_End_Date: z.string().nullish(),
    Support_Start_Date: z.string().nullish(),
    Support_Expiry_Date: z.string().nullish(),
    Description: z.string().nullish(),
    Taxable: z.boolean().nullish(),
    Product_Active: z.boolean().nullish(),
    Vendor_Name: VendorNameSchema.nullish(),
    Created_By: OwnerSchema.nullish(),
    Modified_By: OwnerSchema.nullish(),
    Created_Time: z.string().nullish(),
    Modified_Time: z.string().nullish(),
    Usage_Unit: z.string().nullish(),
    Tax: z.array(z.string()).nullish(),
    Reorder_Level: z.number().nullish(),
    $currency_symbol: z.string().nullish(),
    $editable: z.boolean().nullish(),
    $taxable: z.boolean().nullish()
});

const action = createAction({
    description: 'Retrieve a single product from Zoho CRM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-product',
        group: 'Products'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.products.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/products/get-product.html
        const response = await nango.get({
            endpoint: `crm/v2/Products/${input.record_id}`,
            retries: 3
        });

        if (!response.data || !response.data.data || response.data.data.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Product not found',
                record_id: input.record_id
            });
        }

        const providerProduct = ProviderProductSchema.parse(response.data.data[0]);

        return providerProduct;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
