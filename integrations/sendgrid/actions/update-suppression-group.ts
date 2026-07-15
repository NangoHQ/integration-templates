import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    group_id: z.number().describe('The ID of the suppression group to update. Example: 254514'),
    name: z.string().optional().describe('The new name for the suppression group.'),
    description: z.string().optional().describe('The new description for the suppression group.')
});

const ProviderSuppressionGroupSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    last_email_sent_at: z.string().nullable().optional(),
    is_default: z.boolean().optional(),
    unsubscribes: z.number().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    last_email_sent_at: z.string().optional(),
    is_default: z.boolean().optional(),
    unsubscribes: z.number().optional()
});

const action = createAction({
    description: "Update an unsubscribe group's name or description.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['asm.groups.update'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};
        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.description !== undefined) {
            data['description'] = input.description;
        }

        // https://www.twilio.com/docs/sendgrid/api-reference/suppressions-unsubscribe-groups/update-an-unsubscribe-group
        const response = await nango.patch({
            endpoint: `/v3/asm/groups/${encodeURIComponent(input.group_id)}`,
            data,
            retries: 3
        });

        const providerGroup = ProviderSuppressionGroupSchema.parse(response.data);

        return {
            id: providerGroup.id,
            name: providerGroup.name,
            ...(providerGroup.description !== undefined && { description: providerGroup.description }),
            ...(providerGroup.last_email_sent_at != null && { last_email_sent_at: providerGroup.last_email_sent_at }),
            ...(providerGroup.is_default !== undefined && { is_default: providerGroup.is_default }),
            ...(providerGroup.unsubscribes !== undefined && { unsubscribes: providerGroup.unsubscribes })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
