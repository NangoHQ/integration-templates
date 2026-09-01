import { z } from 'zod';
import { createAction } from 'nango';

const PropertiesSchema = z.object({
    status: z
        .union([z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7)])
        .optional()
        .describe(
            'Status of the ticket. Possible values: 2 (Open), 3 (Pending), 4 (Resolved), 5 (Closed), 6 (Waiting on Customer), 7 (Waiting on Third Party)'
        ),
    priority: z
        .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
        .optional()
        .describe('Priority of the ticket. Possible values: 1 (Low), 2 (Medium), 3 (High), 4 (Urgent)'),
    group_id: z.number().optional().describe('ID of the group to assign to the tickets'),
    responder_id: z.number().optional().describe('ID of the agent to assign to the tickets'),
    requester_id: z.number().optional().describe('ID of the requester for the tickets'),
    source: z
        .union([z.literal(1), z.literal(2), z.literal(3), z.literal(7), z.literal(8), z.literal(9), z.literal(10)])
        .optional()
        .describe('Source of the ticket. Possible values: 1 (Email), 2 (Portal), 3 (Phone), 7 (Chat), 8 (MobiHelp), 9 (Feedback Widget), 10 (Outbound Email)'),
    type: z.string().optional().describe('Type of the ticket'),
    product_id: z.number().optional().describe('ID of the product to associate with the tickets'),
    due_by: z.string().optional().describe('Due date for the ticket resolution'),
    fr_due_by: z.string().optional().describe('First response due date'),
    custom_fields: z.record(z.string(), z.unknown()).optional().describe('Custom field key-value pairs'),
    tags: z.array(z.string()).optional().describe('Tags to associate with the tickets'),
    internal_agent_id: z.number().optional().describe('ID of the internal agent to assign'),
    internal_group_id: z.number().optional().describe('ID of the internal group to assign'),
    from_email: z.string().optional().describe('Support email from which replies should be sent'),
    email_config_id: z.number().optional().describe('Support email config ID for the tickets'),
    parent_id: z.number().optional().describe('ID of the parent ticket to link these tickets as children'),
    skip_close_notification: z.boolean().optional().describe('Skip email notifications sent to requesters on closing a ticket')
});

const ReplySchema = z.object({
    body: z.string().describe('Content of the reply to add to the tickets'),
    attachment_ids: z.array(z.number()).optional().describe('IDs of attachments to add to the reply'),
    inline_attachment_ids: z.array(z.number()).optional().describe('IDs of inline attachments to add to the reply')
});

const InputSchema = z
    .object({
        ids: z.array(z.number()).describe('IDs of tickets to be updated'),
        properties: PropertiesSchema.optional().describe('Ticket properties to update on all selected tickets'),
        reply: ReplySchema.optional().describe('Optional reply to add to all selected tickets')
    })
    .describe('Input to bulk update multiple Freshdesk tickets');

const OutputSchema = z
    .object({
        job_id: z.string().describe('ID of the background job processing the bulk update'),
        href: z.string().describe('URL to check the job status')
    })
    .describe('Result of a bulk ticket update, returning the asynchronous job reference');

const ProviderResponseSchema = z.object({
    job_id: z.string(),
    href: z.string()
});

/**
 * @tags: [write]
 * @tagReason: Mutates multiple tickets by updating their properties in a single provider call.
 * @pitfalls: The update runs asynchronously in the background; verify completion via the returned job_id. Updating internal_group_id or internal_agent_id requires also passing a status value.
 */
const action = createAction({
    description: 'Update multiple Freshdesk tickets in a single call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        type BulkActionPayload = {
            bulk_action: {
                ids: number[];
                properties?: z.infer<typeof PropertiesSchema>;
                reply?: z.infer<typeof ReplySchema>;
            };
        };

        const payload: BulkActionPayload = {
            bulk_action: {
                ids: input.ids
            }
        };

        if (input.properties !== undefined) {
            payload.bulk_action.properties = input.properties;
        }

        if (input.reply !== undefined) {
            payload.bulk_action.reply = input.reply;
        }

        // https://developers.freshdesk.com/api/#bulk_update_tickets
        const response = await nango.post({
            endpoint: '/api/v2/tickets/bulk_update',
            data: payload,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- non-idempotent create/mutation; retries must be 0
            retries: 0
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            job_id: providerResponse.job_id,
            href: providerResponse.href
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
