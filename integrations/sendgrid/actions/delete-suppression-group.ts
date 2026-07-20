import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    group_id: z.number().describe('The ID of the unsubscribe group to delete. Example: 12345')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete an unsubscribe group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['asm.groups.delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.twilio.com/docs/sendgrid/api-reference/suppressions-api-delete-a-suppression-group
            endpoint: `/v3/asm/groups/${encodeURIComponent(String(input.group_id))}`,
            retries: 3
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Expected 204 but received ${response.status}`,
                group_id: input.group_id
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
