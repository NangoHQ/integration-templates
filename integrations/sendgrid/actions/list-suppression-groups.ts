import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const GroupSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    last_email_sent_at: z.string().nullable().optional(),
    is_default: z.boolean().optional(),
    unsubscribes: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(GroupSchema)
});

const action = createAction({
    description: 'List unsubscribe groups.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input) => {
        const response = await nango.get({
            // https://www.twilio.com/docs/sendgrid/api-reference/suppressions-unsubscribe-groups
            endpoint: '/v3/asm/groups',
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of suppression groups from the provider.'
            });
        }

        const items = response.data.map((group: unknown) => {
            const parsed = GroupSchema.parse(group);
            return {
                id: parsed.id,
                name: parsed.name,
                ...(parsed.description !== undefined && { description: parsed.description }),
                ...(parsed.last_email_sent_at !== undefined && parsed.last_email_sent_at !== null && { last_email_sent_at: parsed.last_email_sent_at }),
                ...(parsed.is_default !== undefined && { is_default: parsed.is_default }),
                ...(parsed.unsubscribes !== undefined && { unsubscribes: parsed.unsubscribes })
            };
        });

        return { items };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
