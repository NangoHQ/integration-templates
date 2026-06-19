import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique ID of the product to update. Example: "4150868000002795025"'),
    Product_Name: z.string().optional().describe('Name of the product'),
    Product_Code: z.string().optional().describe('Product identification code'),
    Product_Category: z.string().optional().describe('Category of the product'),
    Description: z.string().optional().describe('Description of the product'),
    Manufacturer: z.string().optional().describe('Name of the product manufacturer'),
    Unit_Price: z.number().optional().describe('Price of each unit of the product'),
    Usage_Unit: z.string().optional().describe('Usage unit such as dozen, each, box, etc'),
    Qty_in_Stock: z.number().optional().describe('Number of product units in stock'),
    Qty_Ordered: z.number().optional().describe('Number of product units ordered'),
    Qty_in_Demand: z.number().optional().describe('Quantity in demand'),
    Reorder_Level: z.number().optional().describe('Reorder value'),
    Commission_Rate: z.number().optional().describe('Commission rate for selling the product'),
    Product_Active: z.boolean().optional().describe('Whether the product is active'),
    Taxable: z.boolean().optional().describe('Whether the product is taxable'),
    Sales_Start_Date: z.string().optional().describe('Date on which product sale starts (YYYY-MM-DD)'),
    Sales_End_Date: z.string().optional().describe('Date on which product sale ends (YYYY-MM-DD)'),
    Support_Start_Date: z.string().optional().describe('Date on which product support starts (YYYY-MM-DD)'),
    Support_Expiry_Date: z.string().optional().describe('Date on which product support ends (YYYY-MM-DD)'),
    Vendor_Name: z
        .object({
            id: z.string()
        })
        .optional()
        .describe('Vendor information with id'),
    Owner: z
        .object({
            id: z.string()
        })
        .optional()
        .describe('Owner information with id')
});

const UpdateResponseDetailSchema = z.object({
    id: z.string().optional()
});

const UpdateResponseItemSchema = z.object({
    code: z.string(),
    details: UpdateResponseDetailSchema.optional(),
    message: z.string(),
    status: z.string()
});

const ProviderUpdateResponseSchema = z.object({
    data: z.array(UpdateResponseItemSchema)
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the updated product'),
    success: z.boolean().describe('Whether the update was successful'),
    message: z.string().optional().describe('Status message from the API')
});

const action = createAction({
    description: 'Update a product in Zoho CRM',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.products.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: Record<string, unknown> = {};

        if (input.Product_Name !== undefined) {
            updateData['Product_Name'] = input.Product_Name;
        }
        if (input.Product_Code !== undefined) {
            updateData['Product_Code'] = input.Product_Code;
        }
        if (input.Product_Category !== undefined) {
            updateData['Product_Category'] = input.Product_Category;
        }
        if (input.Description !== undefined) {
            updateData['Description'] = input.Description;
        }
        if (input.Manufacturer !== undefined) {
            updateData['Manufacturer'] = input.Manufacturer;
        }
        if (input.Unit_Price !== undefined) {
            updateData['Unit_Price'] = input.Unit_Price;
        }
        if (input.Usage_Unit !== undefined) {
            updateData['Usage_Unit'] = input.Usage_Unit;
        }
        if (input.Qty_in_Stock !== undefined) {
            updateData['Qty_in_Stock'] = input.Qty_in_Stock;
        }
        if (input.Qty_Ordered !== undefined) {
            updateData['Qty_Ordered'] = input.Qty_Ordered;
        }
        if (input.Qty_in_Demand !== undefined) {
            updateData['Qty_in_Demand'] = input.Qty_in_Demand;
        }
        if (input.Reorder_Level !== undefined) {
            updateData['Reorder_Level'] = input.Reorder_Level;
        }
        if (input.Commission_Rate !== undefined) {
            updateData['Commission_Rate'] = input.Commission_Rate;
        }
        if (input.Product_Active !== undefined) {
            updateData['Product_Active'] = input.Product_Active;
        }
        if (input.Taxable !== undefined) {
            updateData['Taxable'] = input.Taxable;
        }
        if (input.Sales_Start_Date !== undefined) {
            updateData['Sales_Start_Date'] = input.Sales_Start_Date;
        }
        if (input.Sales_End_Date !== undefined) {
            updateData['Sales_End_Date'] = input.Sales_End_Date;
        }
        if (input.Support_Start_Date !== undefined) {
            updateData['Support_Start_Date'] = input.Support_Start_Date;
        }
        if (input.Support_Expiry_Date !== undefined) {
            updateData['Support_Expiry_Date'] = input.Support_Expiry_Date;
        }
        if (input.Vendor_Name !== undefined) {
            updateData['Vendor_Name'] = input.Vendor_Name;
        }
        if (input.Owner !== undefined) {
            updateData['Owner'] = input.Owner;
        }

        if (Object.keys(updateData).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one field must be provided to update'
            });
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/update-specific-record.html
        const response = await nango.put({
            endpoint: `/crm/v2/Products/${input.id}`,
            data: {
                data: [updateData]
            },
            retries: 3
        });

        const parsedResponse = ProviderUpdateResponseSchema.parse(response.data);

        if (parsedResponse.data.length === 0) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'No response data received from the API'
            });
        }

        const result = parsedResponse.data[0];

        if (!result) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'No result data received from the API'
            });
        }

        if (result.status !== 'success') {
            throw new nango.ActionError({
                type: 'update_failed',
                message: result.message,
                code: result.code
            });
        }

        return {
            id: input.id,
            success: result.status === 'success',
            message: result.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
