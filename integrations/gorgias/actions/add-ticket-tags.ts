import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ticket_id: z.number().describe('The ID of the ticket to add tags to.'),
        names: z.array(z.string()).optional().describe('Names of existing tags to add to the ticket. The tags must already exist on the account.'),
        ids: z.array(z.number()).optional().describe('IDs of existing tags to add to the ticket.')
    })
    .describe('Input for adding existing tags to a ticket.');

const OutputSchema = z.object({}).describe('Empty response indicating the tags were successfully added.');

/**
 * @tags: [write]
 * @tagReason: Adds existing tags to a ticket via a POST mutation.
 * @pitfalls: Tag names must already exist on the account; pass ids instead if a tag may not exist yet.
 */
const action = createAction({
    description: 'Add one or more existing tags to a ticket (additive, does not remove existing tags).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.names?.length && !input.ids?.length) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of names or ids must be provided.'
            });
        }

        const body: { names?: string[]; ids?: number[] } = {};
        if (input.names?.length) {
            body.names = input.names;
        }
        if (input.ids?.length) {
            body.ids = input.ids;
        }

        const response = await nango.post({
            // https://developers.gorgias.com/reference/create-ticket-tags
            endpoint: `/api/tickets/${encodeURIComponent(String(input.ticket_id))}/tags`,
            data: body,
            retries: 3
        });

        if (response.status !== 200 && response.status !== 201) {
            throw new nango.ActionError({
                type: 'api_error',
                message: `Unexpected status code ${response.status} from Gorgias API.`,
                status: response.status
            });
        }

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
