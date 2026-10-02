import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('Unique ID of the deal to retrieve (24-character hex string). Example: "629475917295261d9b1f4403".')
    })
    .describe('Input for retrieving a single Brevo CRM deal.');

const DealAttributesSchema = z
    .object({
        deal_name: z.string().optional().describe('Name of the deal. Example: "Deal: Connect with company".'),
        deal_owner: z.string().optional().describe('ID or email of the Brevo user who owns the deal.'),
        deal_stage: z.string().optional().describe('ID of the pipeline stage the deal is currently in.'),
        pipeline: z.string().optional().describe('ID of the CRM pipeline the deal belongs to.'),
        amount: z.number().optional().describe('Monetary amount associated with the deal.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp of when the deal was created. Example: "2022-05-30T07:42:05.671Z".'),
        last_updated_date: z.string().optional().describe('ISO 8601 timestamp of when the deal was last updated.'),
        stage_updated_at: z.string().optional().describe('ISO 8601 timestamp of when the deal last changed stage.'),
        last_activity_date: z.string().optional().describe('ISO 8601 timestamp of the last activity recorded on the deal.'),
        number_of_contacts: z.number().optional().describe('Number of contacts linked to the deal.'),
        number_of_activities: z.number().optional().describe('Number of activities recorded on the deal.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string().describe('Unique ID of the deal (24-character hex string). Example: "629475917295261d9b1f4403".'),
        attributes: DealAttributesSchema.optional().describe(
            'Deal attributes with their values. May include custom deal attributes in addition to the documented fields.'
        ),
        linkedContactsIds: z.array(z.number()).optional().describe('IDs of the contacts linked to this deal.'),
        linkedCompaniesIds: z.array(z.string()).optional().describe('IDs of the companies linked to this deal (24-character hex strings).'),
        createdBy: z.string().optional().describe('ID of the Brevo user who created the deal.')
    })
    .describe('A single Brevo CRM deal with its attributes and linked records.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single deal from the provider without modifying any data.
 * @pitfalls: Deal IDs are 24-character hex strings, unlike the small numeric IDs Brevo uses for contacts, lists, and campaigns — store and pass them as strings.
 */
const action = createAction({
    description: 'Retrieve a single deal by ID',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.brevo.com/reference/get_crm-deals-id
            endpoint: `/crm/deals/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
