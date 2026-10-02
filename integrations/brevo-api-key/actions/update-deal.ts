import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        deal_id: z
            .string()
            .min(1)
            .describe('Unique id of the deal to update. Deal ids are 24-character hexadecimal strings. Example: "629475917295261d9b1f4403"'),
        deal_name: z.string().optional().describe('New name for the deal. Omit to leave the current name unchanged.'),
        amount: z.number().optional().describe('New monetary amount for the deal. Omit to leave the current amount unchanged.'),
        custom_fields: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
                'Additional deal attributes to update, keyed by attribute name (for example {"my_custom_field": "value"}). Merged together with deal_name and amount into a single partial attributes update. Omit to leave custom attributes unchanged.'
            )
    })
    .describe("Input for updating a Brevo deal's attributes. At least one of deal_name, amount, or custom_fields must be provided.");

const KNOWN_ATTRIBUTE_KEYS = new Set([
    'deal_name',
    'amount',
    'deal_stage',
    'deal_owner',
    'pipeline',
    'created_at',
    'last_updated_date',
    'last_activity_date',
    'stage_updated_at',
    'number_of_contacts',
    'number_of_activities'
]);

const ProviderDealSchema = z.object({
    id: z.string(),
    attributes: z
        .object({
            deal_name: z.string().optional(),
            amount: z.number().optional(),
            deal_stage: z.string().optional(),
            deal_owner: z.string().optional(),
            pipeline: z.string().optional(),
            created_at: z.string().optional(),
            last_updated_date: z.string().optional()
        })
        .catchall(z.unknown())
        .optional(),
    linkedContactsIds: z.array(z.number()).optional(),
    linkedCompaniesIds: z.array(z.string()).optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique id of the updated deal. Example: "629475917295261d9b1f4403"'),
        deal_name: z.string().optional().describe('Name of the deal after the update.'),
        amount: z.number().optional().describe('Monetary amount of the deal after the update. Absent when no amount is set on the deal.'),
        deal_stage: z.string().optional().describe('Id of the pipeline stage the deal is currently in. Example: "9e577ff7-8e42-4ab3-be26-2b5e01b42518"'),
        pipeline: z.string().optional().describe('Id of the pipeline the deal belongs to. Example: "6093d296ad1e9c5cf2140a58"'),
        deal_owner: z.string().optional().describe('Id or email of the account user who owns the deal.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp of when the deal was created. Example: "2022-05-30T07:42:05.671Z"'),
        last_updated_date: z.string().optional().describe('ISO 8601 timestamp of when the deal was last modified. Example: "2022-06-06T08:38:36.761Z"'),
        linked_contacts_ids: z.array(z.number()).describe('Ids of the contacts linked to the deal. Empty when no contacts are linked.'),
        linked_companies_ids: z.array(z.string()).describe('Ids of the companies linked to the deal. Empty when no companies are linked.'),
        custom_fields: z
            .record(z.string(), z.unknown())
            .optional()
            .describe("Current values of the deal's custom (non-standard) attributes after the update. Absent when the deal has no custom attributes set.")
    })
    .describe('The updated deal with its current attribute values and linked contacts and companies.');

/**
 * @tags: [read, write]
 * @tagReason: Updates the deal's attributes with a PATCH, then reads the deal back with a GET to return its updated state.
 * @pitfalls: Moving a deal to a different pipeline or stage is not reliably supported: although Brevo's docs describe updating the pipeline and deal_stage attributes, passing them (for example via custom_fields) was observed to be rejected with a 400 'Invalid attribute' error, so use this action for attribute values such as deal_name, amount, and custom fields only.
 */
const action = createAction({
    description: "Update a deal's attributes (name, amount, custom fields).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const attributes: Record<string, unknown> = { ...(input.custom_fields ?? {}) };
        if (input.deal_name !== undefined) {
            attributes['deal_name'] = input.deal_name;
        }
        if (input.amount !== undefined) {
            attributes['amount'] = input.amount;
        }

        if (Object.keys(attributes).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide at least one field to update: deal_name, amount, or custom_fields.'
            });
        }

        // https://developers.brevo.com/reference/update-a-deal
        await nango.patch({
            endpoint: `/crm/deals/${encodeURIComponent(input.deal_id)}`,
            data: { attributes },
            // This PATCH is naturally idempotent: it sets attributes to absolute values, so retrying a lost response re-applies the same end state.
            retries: 3
        });

        // The update returns 204 No Content, so fetch the deal to return its updated state.
        // https://developers.brevo.com/reference/get-a-deal
        const response = await nango.get({
            endpoint: `/crm/deals/${encodeURIComponent(input.deal_id)}`,
            retries: 3
        });

        const deal = ProviderDealSchema.parse(response.data);
        const dealAttributes = deal.attributes ?? {};

        const customFields: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(dealAttributes)) {
            if (!KNOWN_ATTRIBUTE_KEYS.has(key)) {
                customFields[key] = value;
            }
        }

        return {
            id: deal.id,
            ...(dealAttributes.deal_name !== undefined && { deal_name: dealAttributes.deal_name }),
            ...(dealAttributes.amount !== undefined && { amount: dealAttributes.amount }),
            ...(dealAttributes.deal_stage !== undefined && { deal_stage: dealAttributes.deal_stage }),
            ...(dealAttributes.pipeline !== undefined && { pipeline: dealAttributes.pipeline }),
            ...(dealAttributes.deal_owner !== undefined && { deal_owner: dealAttributes.deal_owner }),
            ...(dealAttributes.created_at !== undefined && { created_at: dealAttributes.created_at }),
            ...(dealAttributes.last_updated_date !== undefined && { last_updated_date: dealAttributes.last_updated_date }),
            linked_contacts_ids: deal.linkedContactsIds ?? [],
            linked_companies_ids: deal.linkedCompaniesIds ?? [],
            ...(Object.keys(customFields).length > 0 && { custom_fields: customFields })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
