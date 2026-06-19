import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    Product_Name: z.string().describe('Name of the product. This is a mandatory field.'),
    Product_Code: z.string().optional().describe('Product identification code given manually by the user.'),
    Product_Category: z.string().optional().describe('Category of the product.'),
    Manufacturer: z.string().optional().describe('Name of the product manufacturer.'),
    Unit_Price: z.number().optional().describe('The price of each unit of the product.'),
    Description: z.string().optional().describe('Description of the product.'),
    Qty_in_Stock: z.number().optional().describe('The number of product units in stock.'),
    Qty_in_Demand: z.number().optional().describe('The quantity in demand.'),
    Qty_Ordered: z.number().optional().describe('The number of product units ordered.'),
    Reorder_Level: z.number().optional().describe('The reorder value.'),
    Sales_Start_Date: z.string().optional().describe('Date on which the product sale starts (YYYY-MM-DD).'),
    Sales_End_Date: z.string().optional().describe('Date on which the product sale ends (YYYY-MM-DD).'),
    Support_Start_Date: z.string().optional().describe('Date on which the product support starts (YYYY-MM-DD).'),
    Support_Expiry_Date: z.string().optional().describe('The date on which the product support ends (YYYY-MM-DD).'),
    Usage_Unit: z.string().optional().describe('Usage unit of the product such as dozen, each, box, etc.'),
    Taxable: z.boolean().optional().describe('Whether the product is taxable.'),
    Product_Active: z.boolean().optional().describe('Whether the product is active.'),
    Commission_Rate: z.number().optional().describe('Commission rate for selling the product.')
});

const OwnerSchema = z.object({
    name: z.string(),
    id: z.string(),
    email: z.string().optional()
});

const CreatedBySchema = z.object({
    name: z.string(),
    id: z.string(),
    email: z.string().optional()
});

const ModifiedBySchema = z.object({
    name: z.string(),
    id: z.string(),
    email: z.string().optional()
});

const ProviderProductDetailsSchema = z.object({
    id: z.string(),
    Product_Name: z.string().optional(),
    Product_Code: z.string().optional(),
    Product_Category: z.string().optional(),
    Manufacturer: z.string().optional(),
    Unit_Price: z.number().optional(),
    Description: z.string().optional(),
    Qty_in_Stock: z.number().optional(),
    Qty_in_Demand: z.number().optional(),
    Qty_Ordered: z.number().optional(),
    Reorder_Level: z.number().optional(),
    Sales_Start_Date: z.string().optional(),
    Sales_End_Date: z.string().optional(),
    Support_Start_Date: z.string().optional(),
    Support_Expiry_Date: z.string().optional(),
    Usage_Unit: z.string().optional(),
    Taxable: z.boolean().optional(),
    Product_Active: z.boolean().optional(),
    Commission_Rate: z.number().optional(),
    Owner: OwnerSchema.optional(),
    Created_By: CreatedBySchema.optional(),
    Modified_By: ModifiedBySchema.optional(),
    Created_Time: z.string().optional(),
    Modified_Time: z.string().optional()
});

const ProviderResponseItemSchema = z.object({
    code: z.string(),
    details: ProviderProductDetailsSchema,
    message: z.string(),
    status: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderResponseItemSchema)
});

const OutputSchema = z.object({
    id: z.string().describe('Unique ID of the created product.'),
    Product_Name: z.string().describe('Name of the product.'),
    Product_Code: z.string().optional(),
    Product_Category: z.string().optional(),
    Manufacturer: z.string().optional(),
    Unit_Price: z.number().optional(),
    Description: z.string().optional(),
    Qty_in_Stock: z.number().optional(),
    Qty_in_Demand: z.number().optional(),
    Qty_Ordered: z.number().optional(),
    Reorder_Level: z.number().optional(),
    Sales_Start_Date: z.string().optional(),
    Sales_End_Date: z.string().optional(),
    Support_Start_Date: z.string().optional(),
    Support_Expiry_Date: z.string().optional(),
    Usage_Unit: z.string().optional(),
    Taxable: z.boolean().optional(),
    Product_Active: z.boolean().optional(),
    Commission_Rate: z.number().optional(),
    Owner: OwnerSchema.optional(),
    Created_By: CreatedBySchema.optional(),
    Modified_By: ModifiedBySchema.optional(),
    Created_Time: z.string().optional(),
    Modified_Time: z.string().optional()
});

const action = createAction({
    description: 'Create a product in Zoho CRM.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.products.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            Product_Name: input.Product_Name
        };

        if (input.Product_Code !== undefined) {
            payload['Product_Code'] = input.Product_Code;
        }
        if (input.Product_Category !== undefined) {
            payload['Product_Category'] = input.Product_Category;
        }
        if (input.Manufacturer !== undefined) {
            payload['Manufacturer'] = input.Manufacturer;
        }
        if (input.Unit_Price !== undefined) {
            payload['Unit_Price'] = input.Unit_Price;
        }
        if (input.Description !== undefined) {
            payload['Description'] = input.Description;
        }
        if (input.Qty_in_Stock !== undefined) {
            payload['Qty_in_Stock'] = input.Qty_in_Stock;
        }
        if (input.Qty_in_Demand !== undefined) {
            payload['Qty_in_Demand'] = input.Qty_in_Demand;
        }
        if (input.Qty_Ordered !== undefined) {
            payload['Qty_Ordered'] = input.Qty_Ordered;
        }
        if (input.Reorder_Level !== undefined) {
            payload['Reorder_Level'] = input.Reorder_Level;
        }
        if (input.Sales_Start_Date !== undefined) {
            payload['Sales_Start_Date'] = input.Sales_Start_Date;
        }
        if (input.Sales_End_Date !== undefined) {
            payload['Sales_End_Date'] = input.Sales_End_Date;
        }
        if (input.Support_Start_Date !== undefined) {
            payload['Support_Start_Date'] = input.Support_Start_Date;
        }
        if (input.Support_Expiry_Date !== undefined) {
            payload['Support_Expiry_Date'] = input.Support_Expiry_Date;
        }
        if (input.Usage_Unit !== undefined) {
            payload['Usage_Unit'] = input.Usage_Unit;
        }
        if (input.Taxable !== undefined) {
            payload['Taxable'] = input.Taxable;
        }
        if (input.Product_Active !== undefined) {
            payload['Product_Active'] = input.Product_Active;
        }
        if (input.Commission_Rate !== undefined) {
            payload['Commission_Rate'] = input.Commission_Rate;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/insert-records.html
        const response = await nango.post({
            endpoint: '/crm/v2/Products',
            data: { data: [payload] },
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No data returned from Zoho CRM API'
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse Zoho CRM response',
                details: parsed.error.message
            });
        }

        const responseItem = parsed.data.data[0];
        if (!responseItem) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No product returned from creation'
            });
        }

        if (responseItem.status !== 'success') {
            throw new nango.ActionError({
                type: 'api_error',
                message: responseItem.message,
                code: responseItem.code
            });
        }

        const product = responseItem.details;

        return {
            id: product.id,
            Product_Name: input.Product_Name,
            ...(input.Product_Code !== undefined && { Product_Code: input.Product_Code }),
            ...(input.Product_Category !== undefined && { Product_Category: input.Product_Category }),
            ...(input.Manufacturer !== undefined && { Manufacturer: input.Manufacturer }),
            ...(input.Unit_Price !== undefined && { Unit_Price: input.Unit_Price }),
            ...(input.Description !== undefined && { Description: input.Description }),
            ...(input.Qty_in_Stock !== undefined && { Qty_in_Stock: input.Qty_in_Stock }),
            ...(input.Qty_in_Demand !== undefined && { Qty_in_Demand: input.Qty_in_Demand }),
            ...(input.Qty_Ordered !== undefined && { Qty_Ordered: input.Qty_Ordered }),
            ...(input.Reorder_Level !== undefined && { Reorder_Level: input.Reorder_Level }),
            ...(input.Sales_Start_Date !== undefined && { Sales_Start_Date: input.Sales_Start_Date }),
            ...(input.Sales_End_Date !== undefined && { Sales_End_Date: input.Sales_End_Date }),
            ...(input.Support_Start_Date !== undefined && { Support_Start_Date: input.Support_Start_Date }),
            ...(input.Support_Expiry_Date !== undefined && { Support_Expiry_Date: input.Support_Expiry_Date }),
            ...(input.Usage_Unit !== undefined && { Usage_Unit: input.Usage_Unit }),
            ...(input.Taxable !== undefined && { Taxable: input.Taxable }),
            ...(input.Product_Active !== undefined && { Product_Active: input.Product_Active }),
            ...(input.Commission_Rate !== undefined && { Commission_Rate: input.Commission_Rate }),
            ...(product.Created_Time !== undefined && { Created_Time: product.Created_Time }),
            ...(product.Modified_Time !== undefined && { Modified_Time: product.Modified_Time }),
            ...(product.Created_By !== undefined && { Created_By: product.Created_By }),
            ...(product.Modified_By !== undefined && { Modified_By: product.Modified_By })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
