import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required. Returns the full company attribute schema for the connected Brevo account.');

const AttributeOptionSchema = z
    .object({
        key: z.string().optional().describe('Option value used when setting the attribute on a company. Example: "1".'),
        value: z.string().optional().describe('Human-readable option label. Example: "Jane Doe".')
    })
    .describe('A selectable option for a single-select, multi-choice, or user-type attribute.');

const CompanyAttributeSchema = z
    .object({
        internalName: z.string().optional().describe('Internal name used as the attribute key in company payloads. Example: "number_of_employees".'),
        attributeTypeName: z.string().optional().describe('Attribute data type. Examples: "text", "number", "date", "boolean", "user".'),
        label: z.string().optional().describe('Display label shown in the Brevo UI. Example: "Number of employees".'),
        required: z.boolean().optional().describe('Whether the attribute is required when creating a company.'),
        attributeOptions: z
            .array(AttributeOptionSchema)
            .optional()
            .describe('Selectable options for choice-type attributes; for the owner (user) attribute, this lists the account users.'),
        isValueReadonly: z.boolean().optional().describe('Whether the attribute value is read-only and cannot be set on a company.')
    })
    .describe('A single company attribute definition.');

const OutputSchema = z
    .object({
        attributes: z.array(CompanyAttributeSchema).describe('All company attributes defined for the account, including system-default and custom attributes.')
    })
    .describe('Schema of attributes available on Brevo company (CRM) objects.');

const ProviderAttributeOptionSchema = z.object({
    key: z.string().optional(),
    value: z.string().optional()
});

const ProviderCompanyAttributeSchema = z.object({
    internalName: z.string().optional(),
    attributeTypeName: z.string().optional(),
    label: z.string().optional(),
    required: z.boolean().optional(),
    isRequired: z.boolean().optional(),
    attributeOptions: z.array(ProviderAttributeOptionSchema).optional(),
    isValueReadonly: z.boolean().optional()
});

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET of the company attribute schema; it never creates, updates, or deletes anything in Brevo.
 * @pitfalls: The schema mixes read-only system attributes (e.g. created_at, last_updated_at, number_of_contacts) with writable ones; filter on isValueReadonly before using the result to build company create or update payloads.
 */
const action = createAction({
    description: 'List the schema of attributes available on company (CRM) objects.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/get-company-attributes
        const response = await nango.get({
            endpoint: '/crm/attributes/companies',
            retries: 3
        });

        const parsed = z.array(ProviderCompanyAttributeSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Unexpected response from the Brevo company attributes endpoint: ${parsed.error.message}`);
        }

        return {
            attributes: parsed.data.map((attribute) => {
                const required = attribute.required ?? attribute.isRequired;
                return {
                    ...(attribute.internalName !== undefined && { internalName: attribute.internalName }),
                    ...(attribute.attributeTypeName !== undefined && { attributeTypeName: attribute.attributeTypeName }),
                    ...(attribute.label !== undefined && { label: attribute.label }),
                    ...(required !== undefined && { required }),
                    ...(attribute.attributeOptions !== undefined && {
                        attributeOptions: attribute.attributeOptions.map((option) => ({
                            ...(option.key !== undefined && { key: option.key }),
                            ...(option.value !== undefined && { value: option.value })
                        }))
                    }),
                    ...(attribute.isValueReadonly !== undefined && { isValueReadonly: attribute.isValueReadonly })
                };
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
