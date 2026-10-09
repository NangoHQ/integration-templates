import { z } from 'zod';
import { createAction } from 'nango';

const TagSchema = z.object({
    name: z.string().describe('Name of the tag to associate with the product.')
});

const InputSchema = z
    .object({
        Product_Name: z
            .string()
            .describe('Name of the product. This system-defined mandatory field is also the default field used to detect an existing record to update.'),
        Product_Code: z.string().optional().describe('Unique code or identifier for the product.'),
        Unit_Price: z.number().optional().describe('Unit price or cost of the product.'),
        Product_Category: z.string().optional().describe('Category or type of the product.'),
        Description: z.string().optional().describe('Additional description or notes about the product.'),
        Product_Active: z.boolean().optional().describe('Whether the product is currently active.'),
        Owner: z
            .object({
                id: z.string().describe('User ID of the owner to assign the product to.')
            })
            .optional()
            .describe('Owner to assign the product to.'),
        Tag: z.array(TagSchema).optional().describe('Tags to associate with the product.'),
        duplicate_check_fields: z
            .array(z.string())
            .optional()
            .describe("Ordered field API names used to detect a matching existing record. Defaults to ['Product_Name'] when omitted.")
    })
    .describe('Product fields to create or update, matched by the duplicate-check fields.');

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional()
});

const ProviderResultSchema = z.object({
    code: z.string().optional(),
    duplicate_field: z.string().nullable().optional(),
    action: z.string().optional(),
    details: z.object({
        id: z.string().optional(),
        Created_Time: z.string().optional(),
        Modified_Time: z.string().optional(),
        Created_By: ProviderUserSchema.optional(),
        Modified_By: ProviderUserSchema.optional()
    }),
    message: z.string().optional(),
    status: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderResultSchema)
});

const OutputUserSchema = z.object({
    id: z.string().describe('ID of the user.'),
    name: z.string().nullable().optional().describe('Display name of the user.'),
    email: z.string().nullable().optional().describe('Email address of the user.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the inserted or updated product record.'),
        action: z.enum(['insert', 'update']).describe('Whether a new product was inserted or an existing matching product was updated.'),
        duplicate_field: z
            .string()
            .nullable()
            .optional()
            .describe('Name of the field that matched an existing product, or null when a new product was inserted.'),
        code: z.string().optional().describe('Provider status code for the operation, e.g. "SUCCESS".'),
        message: z.string().optional().describe('Provider human-readable result message, e.g. "record added" or "record updated".'),
        status: z.string().optional().describe('Provider operation status, e.g. "success".'),
        Created_Time: z.string().optional().describe('ISO 8601 timestamp when the product record was created.'),
        Modified_Time: z.string().optional().describe('ISO 8601 timestamp when the product record was last modified.'),
        Created_By: OutputUserSchema.optional().describe('User who created the product record.'),
        Modified_By: OutputUserSchema.optional().describe('User who last modified the product record.')
    })
    .describe('Result of the product upsert, including the record ID and whether it was inserted or updated.');

/**
 * @tags: [write]
 * @tagReason: Creates a new product or updates an existing matching product via the provider's atomic upsert endpoint.
 * @pitfalls: On update only the fields you pass are written, so omitted fields keep their existing values; the default match key is Product_Name, so two distinct products with the same name collide; workflows configured on the Products module are triggered on every call.
 */
const action = createAction({
    description: 'Create a product, or update it if a record already matches on a chosen duplicate-check field - atomic find-or-create.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.products.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const product = {
            Product_Name: input.Product_Name,
            ...(input.Product_Code !== undefined && { Product_Code: input.Product_Code }),
            ...(input.Unit_Price !== undefined && { Unit_Price: input.Unit_Price }),
            ...(input.Product_Category !== undefined && { Product_Category: input.Product_Category }),
            ...(input.Description !== undefined && { Description: input.Description }),
            ...(input.Product_Active !== undefined && { Product_Active: input.Product_Active }),
            ...(input.Owner !== undefined && { Owner: input.Owner }),
            ...(input.Tag !== undefined && { Tag: input.Tag })
        };

        // https://www.bigin.com/developer/docs/apis/v2/upsert-records.html
        const response = await nango.post({
            endpoint: '/bigin/v2/Products/upsert',
            data: {
                data: [product],
                duplicate_check_fields: input.duplicate_check_fields ?? ['Product_Name']
            },
            // Upsert is idempotent on the duplicate-check fields, so retrying a lost response updates the same record instead of duplicating it.
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        const result = parsed.success ? parsed.data.data[0] : undefined;

        if (!result || result.details.id === undefined || (result.action !== 'insert' && result.action !== 'update')) {
            throw new nango.ActionError({
                type: 'upsert_failed',
                message: result?.message ?? 'Bigin did not return a product id for the upsert.',
                ...(result?.code !== undefined && { code: result.code })
            });
        }

        const action: 'insert' | 'update' = result.action === 'update' ? 'update' : 'insert';

        return {
            id: result.details.id,
            action,
            ...(result.duplicate_field !== undefined && { duplicate_field: result.duplicate_field }),
            ...(result.code !== undefined && { code: result.code }),
            ...(result.message !== undefined && { message: result.message }),
            ...(result.status !== undefined && { status: result.status }),
            ...(result.details.Created_Time !== undefined && { Created_Time: result.details.Created_Time }),
            ...(result.details.Modified_Time !== undefined && { Modified_Time: result.details.Modified_Time }),
            ...(result.details.Created_By !== undefined && { Created_By: result.details.Created_By }),
            ...(result.details.Modified_By !== undefined && { Modified_By: result.details.Modified_By })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
