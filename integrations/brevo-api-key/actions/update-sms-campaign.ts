import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        campaignId: z.number().int().positive().describe('ID of the draft SMS campaign to update. Example: 27'),
        name: z.string().optional().describe('New name of the SMS campaign.'),
        sender: z.string().optional().describe('New sender name. Limited to 11 alphanumeric characters or 15 numeric characters. Example: "MyShop"'),
        content: z.string().optional().describe('New SMS message content. Each 160 characters count as one SMS segment.'),
        recipients: z
            .object({
                listIds: z.array(z.number().int()).describe('IDs of the contact lists to send the campaign to. Required when scheduledAt is set.'),
                exclusionListIds: z.array(z.number().int()).optional().describe('IDs of the contact lists to exclude from the campaign.')
            })
            .optional()
            .describe('New recipient configuration for the campaign.'),
        scheduledAt: z
            .string()
            .optional()
            .describe(
                'New UTC date-time on which the campaign has to run (YYYY-MM-DDTHH:mm:ss.SSSZ). Requires recipients to be set in the request or already configured on the campaign.'
            ),
        organisationPrefix: z
            .string()
            .optional()
            .describe('Brand name added before the message content so recipients recognize the sender. Recommended by U.S. carriers.'),
        unicodeEnabled: z.boolean().optional().describe('Whether the message content should be treated as unicode. Defaults to false on the provider side.'),
        unsubscribeInstruction: z
            .string()
            .optional()
            .describe(
                'Instructions to unsubscribe from future communications, appended after the message content. Must include the STOP keyword. Recommended by U.S. carriers.'
            )
    })
    .describe('Update fields of a draft SMS campaign. Provide campaignId plus at least one field to change.');

const RecipientListSchema = z.object({
    id: z.number().optional().describe('ID of the contact list.'),
    name: z.string().optional().describe('Name of the contact list.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the SMS campaign.'),
        name: z.string().describe('Name of the SMS campaign.'),
        status: z.enum(['draft', 'sent', 'archive', 'queued', 'suspended', 'inProcess']).describe('Status of the SMS campaign.'),
        content: z.string().describe('Content of the SMS message.'),
        sender: z.string().describe('Sender name of the SMS campaign.'),
        createdAt: z.string().describe('Creation UTC date-time of the SMS campaign (YYYY-MM-DDTHH:mm:ss.SSSZ).'),
        modifiedAt: z.string().describe('UTC date-time of the last modification of the SMS campaign (YYYY-MM-DDTHH:mm:ss.SSSZ).'),
        recipients: z
            .object({
                lists: z.array(RecipientListSchema).optional().describe('Contact lists the campaign will be sent to.'),
                exclusionLists: z.array(RecipientListSchema).optional().describe('Contact lists excluded from the campaign.')
            })
            .describe('Recipients of the SMS campaign, with each list returned as an id/name object.'),
        statistics: z
            .object({
                delivered: z.number().describe('Number of delivered SMS.'),
                sent: z.number().describe('Number of sent SMS.'),
                processing: z.number().describe('Number of SMS currently being processed.'),
                softBounces: z.number().describe('Number of soft-bounced SMS.'),
                hardBounces: z.number().describe('Number of hard-bounced SMS.'),
                unsubscriptions: z.number().describe('Number of unsubscriptions from the SMS campaign.'),
                answered: z.number().describe('Number of replies to the SMS campaign.')
            })
            .describe('Aggregated delivery statistics of the SMS campaign.'),
        organisationPrefix: z.string().optional().describe('Brand name prepended to the message content. Empty string if not set.'),
        scheduledAt: z
            .string()
            .optional()
            .describe('UTC date-time on which the SMS campaign is scheduled (YYYY-MM-DDTHH:mm:ss.SSSZ). Empty string if not scheduled.'),
        sentDate: z
            .string()
            .optional()
            .describe('UTC date-time on which the SMS campaign was sent (YYYY-MM-DDTHH:mm:ss.SSSZ). Only present when the campaign status is sent.'),
        unsubscribeInstruction: z.string().optional().describe('Unsubscribe instructions appended to the message content. Empty string if not set.'),
        tags: z.array(z.string()).optional().describe('Tags (labels) associated with the SMS campaign.')
    })
    .describe('The SMS campaign with its updated field values and current status.');

/**
 * @tags: [write, read]
 * @tagReason: Updates fields of an SMS campaign via a PUT (write), then reads the updated campaign via a follow-up GET (read) because the update endpoint returns no body.
 * @pitfalls: This is a partial merge: omitted fields keep their current values rather than being reset. Only unsent campaigns can be updated; changes to sent or in-process campaigns are rejected, as is an update containing no fields. Setting scheduledAt requires recipients in the same request or already configured on the campaign.
 */
const action = createAction({
    description: "Update a draft SMS campaign's fields.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // This PUT sets absolute field values, so replaying it after a lost 204 response leaves the campaign in the identical state (naturally idempotent); retries capped at 3 like reads.
        // https://developers.brevo.com/reference/update-sms-campaign
        await nango.put({
            endpoint: `/smsCampaigns/${encodeURIComponent(String(input.campaignId))}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.sender !== undefined && { sender: input.sender }),
                ...(input.content !== undefined && { content: input.content }),
                ...(input.recipients !== undefined && {
                    recipients: {
                        listIds: input.recipients.listIds,
                        ...(input.recipients.exclusionListIds !== undefined && { exclusionListIds: input.recipients.exclusionListIds })
                    }
                }),
                ...(input.scheduledAt !== undefined && { scheduledAt: input.scheduledAt }),
                ...(input.organisationPrefix !== undefined && { organisationPrefix: input.organisationPrefix }),
                ...(input.unicodeEnabled !== undefined && { unicodeEnabled: input.unicodeEnabled }),
                ...(input.unsubscribeInstruction !== undefined && { unsubscribeInstruction: input.unsubscribeInstruction })
            },
            retries: 3
        });

        // The PUT above returns 204 No Content, so fetch the updated campaign to return its current state.
        // https://developers.brevo.com/reference/get-sms-campaign
        const response = await nango.get({
            endpoint: `/smsCampaigns/${encodeURIComponent(String(input.campaignId))}`,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
