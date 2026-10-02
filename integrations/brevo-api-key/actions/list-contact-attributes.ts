import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input parameters. The full contact attribute schema of the account is returned in a single call.');

const EnumerationValueSchema = z.object({
    label: z.string().describe('Display label of the enumeration option. Example: "English"'),
    value: z
        .number()
        .describe(
            'Numeric ID of the enumeration option value. Set to 0 when the raw value cannot be converted to an integer; refer to valueStr for the original string representation.'
        ),
    valueStr: z.string().describe('Original string form of the enumeration option value as stored. Example: "en"')
});

const AttributeSchema = z.object({
    name: z.string().describe('Attribute name as used in contact attribute payloads. Example: "FIRSTNAME"'),
    category: z.string().describe('Category of the attribute. One of: normal, transactional, category, calculated, global.'),
    type: z
        .string()
        .optional()
        .describe('Data type of the attribute. One of: text, date, float, id, boolean, multiple-choice, user. Omitted when not applicable.'),
    field_key: z.string().optional().describe('Lowercase field key of the attribute when present. Example: "firstname"'),
    calculatedValue: z.string().optional().describe('Formula of a calculated attribute. Only present for calculated category attributes.'),
    enumeration: z.array(EnumerationValueSchema).optional().describe('Allowed values of a category-type attribute. Only present for category attributes.'),
    multiCategoryOptions: z
        .array(z.string())
        .optional()
        .describe('Allowed options of a multiple-choice type attribute. Only present for multiple-choice attributes.')
});

const OutputSchema = z
    .object({
        attributes: z.array(AttributeSchema).describe('All contact attributes (built-in and custom) defined in the account.')
    })
    .describe("The account's contact attribute schema, covering both built-in and custom fields.");

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET of the account's contact attribute schema and changes nothing in Brevo.
 * @pitfalls: The type field is absent on some attributes, notably built-in category ones. Within a category attribute's enumeration, every option whose stored value is non-numeric shares the numeric value 0; use valueStr to distinguish options.
 */
const action = createAction({
    description: "List the account's contact attribute schema (built-in and custom fields such as FIRSTNAME/LASTNAME).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/getattributes-1
        const response = await nango.get({
            endpoint: '/contacts/attributes',
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
