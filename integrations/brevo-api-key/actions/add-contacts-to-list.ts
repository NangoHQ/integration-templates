import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        listId: z.number().int().positive().describe('ID of the Brevo contact list to add the contacts to. Example: 2'),
        emails: z.array(z.string()).min(1).describe('Email addresses of the existing contacts to add to the list. Example: ["jane.doe@example.com"]')
    })
    .describe('Target list and the existing contacts, identified by email, to add to it.');

const OutputSchema = z
    .object({
        success: z.array(z.string()).describe('Email addresses that were successfully added to the list.'),
        failure: z.array(z.string()).describe('Email addresses that could not be added because the contact does not exist or is already in the list.')
    })
    .describe('Per-email result report of the batch add.');

const AddContactsResponseSchema = z.object({
    contacts: z
        .object({
            success: z.array(z.string()).optional(),
            failure: z.array(z.string()).optional()
        })
        .optional()
});

/**
 * @tags: [write]
 * @tagReason: Adds existing contacts to a contact list, mutating the list's membership; no provider data is read.
 * @pitfalls: A successful response can still report per-email failures for addresses that do not exist or are already in the list, and when every address in the batch fails for those reasons the whole call errors with a 400 instead of returning a partial report.
 */
const action = createAction({
    description: 'Bulk-add one or more existing contacts, identified by email, to a Brevo contact list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/addcontacttolist-1
        const response = await nango.post({
            endpoint: `/contacts/lists/${input.listId}/contacts/add`,
            data: {
                emails: input.emails
            },
            // Not idempotent: re-adding a contact that is already in the list is rejected with a 400, so a retry after a lost response could turn a success into an error.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = AddContactsResponseSchema.parse(response.data);

        return {
            success: parsed.contacts?.success ?? [],
            failure: parsed.contacts?.failure ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
