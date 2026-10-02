import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        attributeCategory: z.enum(['normal', 'category', 'calculated', 'transactional', 'global']).describe('Category of the attribute. Example: "normal"'),
        attributeName: z.string().describe('Name of the attribute to create. Example: "LOYALTY_TIER"'),
        type: z
            .enum(['text', 'date', 'float', 'boolean', 'id', 'category', 'multiple-choice', 'user'])
            .optional()
            .describe(
                'Type of the attribute. Used for the "normal", "category" and "transactional" categories. "id" is only valid for "transactional", "category" is only valid for "category", and "multiple-choice"/"user" are only valid for "normal". Example: "text"'
            ),
        value: z
            .string()
            .optional()
            .describe('Value of the attribute. Used only when attributeCategory is "calculated" or "global". Example: "SUM(ORDER_AMOUNT)"'),
        enumeration: z
            .array(
                z.object({
                    value: z.number().int().describe('Numeric id of the option. Example: 1'),
                    label: z.string().describe('Label of the option. Example: "male"')
                })
            )
            .optional()
            .describe(
                'Values and labels the attribute can take. Used only for the "category" attributeCategory. Each label is limited to 200 characters. Example: [{"value": 1, "label": "male"}, {"value": 2, "label": "female"}]'
            ),
        multiCategoryOptions: z
            .array(z.string())
            .optional()
            .describe(
                'Options for a multiple-choice attribute. Used only when attributeCategory is "normal" and type is "multiple-choice". Each option is limited to 200 characters. Example: ["USA", "INDIA"]'
            ),
        isRecurring: z.boolean().optional().describe('Whether the attribute is recurring. Used only when attributeCategory is "calculated" or "global".')
    })
    .describe('Definition of the contact attribute to create on the account.');

const OutputSchema = z
    .object({
        attributeCategory: z.string().describe('Category the attribute was created under. Example: "normal"'),
        attributeName: z.string().describe('Name of the created attribute. Example: "LOYALTY_TIER"'),
        type: z.string().optional().describe('Type the attribute was created with, when one was supplied. Example: "text"')
    })
    .describe('Confirmation of the created contact attribute, echoed from the request because the API returns an empty body on success.');

/**
 * @tags: [write]
 * @tagReason: Creates a new custom attribute on the account's contact schema; no provider reads are made.
 * @pitfalls: The API returns an empty body on success, so the created attribute is echoed from the request and actual creation can only be confirmed by listing the contact attributes. Which type values and body fields are accepted depends on attributeCategory: type "id" only for "transactional", "category" only for "category", "multiple-choice"/"user" only for "normal", with enumeration for "category" and value/isRecurring for "calculated"/"global".
 */
const action = createAction({
    description: 'Define a new custom contact attribute (field) on the account contact schema.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/create-attribute
            endpoint: `/contacts/attributes/${encodeURIComponent(input.attributeCategory)}/${encodeURIComponent(input.attributeName)}`,
            data: {
                ...(input.type !== undefined && { type: input.type }),
                ...(input.value !== undefined && { value: input.value }),
                ...(input.enumeration !== undefined && { enumeration: input.enumeration }),
                ...(input.multiCategoryOptions !== undefined && { multiCategoryOptions: input.multiCategoryOptions }),
                ...(input.isRecurring !== undefined && { isRecurring: input.isRecurring })
            },
            // Non-idempotent create: a retry after a lost response would repeat the attribute creation.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries must stay 0 on this non-idempotent create
            retries: 0
        };

        // The API responds with an empty object on success; the created attribute is echoed from the input.
        await nango.post(config);

        return {
            attributeCategory: input.attributeCategory,
            attributeName: input.attributeName,
            ...(input.type !== undefined && { type: input.type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
