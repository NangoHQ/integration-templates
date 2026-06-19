import { z } from 'zod';
import { createAction } from 'nango';

const FilterCriteriaSchema = z.object({
    from: z.string().optional().describe("The sender's display name or email address."),
    to: z.string().optional().describe("The recipient's display name or email address. Includes recipients in the 'to', 'cc', and 'bcc' header fields."),
    subject: z.string().optional().describe("Case-insensitive phrase found in the message's subject."),
    query: z.string().optional().describe('Only return messages matching the specified query. Supports the same query format as the Gmail search box.'),
    negatedQuery: z.string().optional().describe('Only return messages not matching the specified query.'),
    hasAttachment: z.boolean().optional().describe('Whether the message has any attachment.'),
    excludeChats: z.boolean().optional().describe('Whether the response should exclude chats.'),
    size: z.number().optional().describe('The size of the entire RFC822 message in bytes, including all headers and attachments.'),
    sizeComparison: z.enum(['smaller', 'larger', 'unspecified']).optional().describe('How the message size in bytes should be in relation to the size field.')
});

const FilterActionSchema = z.object({
    addLabelIds: z.array(z.string()).optional().describe('List of labels to add to the message.'),
    removeLabelIds: z.array(z.string()).optional().describe('List of labels to remove from the message.'),
    forward: z.string().optional().describe('Email address that the message should be forwarded to.')
});

const InputSchema = z.object({
    criteria: FilterCriteriaSchema,
    action: FilterActionSchema
});

const ProviderFilterSchema = z.object({
    id: z.string(),
    criteria: FilterCriteriaSchema.nullable().optional(),
    action: FilterActionSchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    criteria: FilterCriteriaSchema.optional(),
    action: FilterActionSchema.optional()
});

const action = createAction({
    description: 'Create a mailbox filter with match criteria and label actions.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.settings.basic'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/gmail/api/reference/rest/v1/users.settings.filters/create
        const response = await nango.post({
            endpoint: '/gmail/v1/users/me/settings/filters',
            data: {
                criteria: input.criteria,
                action: input.action
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create filter: no response from Gmail API'
            });
        }

        const providerFilter = ProviderFilterSchema.parse(response.data);

        return {
            id: providerFilter.id,
            ...(providerFilter.criteria != null && { criteria: providerFilter.criteria }),
            ...(providerFilter.action != null && { action: providerFilter.action })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
