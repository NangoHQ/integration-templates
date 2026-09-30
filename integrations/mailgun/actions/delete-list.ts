import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        list_address: z.string().describe('Full address of the mailing list to delete. Example: "dev@mg.example.com"')
    })
    .describe('Input for deleting a Mailgun mailing list');

const OutputSchema = z
    .object({
        address: z.string().describe('Address of the deleted mailing list.'),
        message: z.string().describe('Confirmation message returned by Mailgun, e.g. "Mailing list has been removed".')
    })
    .describe('Result of deleting a Mailgun mailing list');

const DeleteListResponseSchema = z.object({
    address: z.string(),
    message: z.string()
});

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a mailing list on the provider, a mutation that cannot be undone.
 * @pitfalls: Deletion is permanent and cannot be undone; deleting a list also deletes all of its members.
 */
const action = createAction({
    description: 'Delete a mailing list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://documentation.mailgun.com/docs/mailgun (DELETE /v3/lists/{list_address})
        const response = await nango.delete({
            endpoint: `/v3/lists/${encodeURIComponent(input.list_address)}`,
            // Not idempotent: retrying after a lost-but-successful delete would 404 and mask the original success.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const deleted = DeleteListResponseSchema.parse(response.data);

        return {
            address: deleted.address,
            message: deleted.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
