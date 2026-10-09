import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        account_id: z.string().describe('Bigin Account (Company) record ID to delete. Example: "7618134000000632027"'),
        confirm: z
            .boolean()
            .optional()
            .describe(
                'Set to true to delete the account even when it has linked contacts that will be cascade-deleted. Defaults to false, which blocks the delete and reports the linked contacts instead.'
            )
    })
    .describe('Input for safely deleting a Bigin account, with an optional confirmation flag for accounts that have linked contacts.');

const LinkedContactSchema = z.object({
    id: z.string().describe('Bigin record ID of the linked contact.'),
    First_Name: z.string().optional().describe('First name of the linked contact, when set.'),
    Last_Name: z.string().optional().describe('Last name of the linked contact, when set.'),
    Email: z.string().optional().describe('Email address of the linked contact, when set.')
});

const OutputSchema = z
    .object({
        deleted: z.boolean().describe('True when the account was deleted and its removal was verified; false when the delete was blocked by linked contacts.'),
        blockedBy: z.string().optional().describe('Reason the delete was blocked. Present and equal to "linked_contacts" only when deleted is false.'),
        linkedContacts: z
            .array(LinkedContactSchema)
            .optional()
            .describe('Contacts linked to the account at the time the delete was blocked. Present only when deleted is false.'),
        cascadeDeletedContacts: z
            .array(LinkedContactSchema)
            .optional()
            .describe('Contacts that were cascade-deleted together with the account. Present only when deleted is true.')
    })
    .describe('Result of the delete attempt, indicating whether the account was deleted or the delete was blocked by linked contacts.');

const RelatedListResponseSchema = z.object({
    data: z
        .array(
            z.object({
                id: z.string(),
                First_Name: z.string().nullish(),
                Last_Name: z.string().nullish(),
                Email: z.string().nullish()
            })
        )
        .optional()
});

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the account's linked contacts, then permanently deletes the account, which also cascade-deletes every linked contact.
 * @pitfalls: Deletion is permanent and cascade-deletes every linked contact, including any contact linked between the pre-delete check and the delete (which will not appear in cascadeDeletedContacts); when confirm is not true and linked contacts exist, the action changes nothing and returns deleted:false.
 */
const action = createAction({
    description:
        'COMPOSITE: delete an account, but first check whether it has any linked contacts - refuse (by default) or require an explicit confirm flag before proceeding, since a plain delete-account call was confirmed live to cascade-delete every linked contact.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const accountId = encodeURIComponent(input.account_id);

        // https://www.bigin.com/developer/docs/apis/v2/get-related-records.html
        const related = await nango.get({
            endpoint: `/bigin/v2/Accounts/${accountId}/Contacts`,
            params: {
                fields: 'id,First_Name,Last_Name,Email'
            },
            retries: 3
        });

        let linkedContacts: z.infer<typeof LinkedContactSchema>[] = [];
        if (related.status !== 204 && related.data) {
            const parsed = RelatedListResponseSchema.parse(related.data);
            linkedContacts = (parsed.data ?? []).map((contact) => ({
                id: contact.id,
                ...(contact.First_Name != null && { First_Name: contact.First_Name }),
                ...(contact.Last_Name != null && { Last_Name: contact.Last_Name }),
                ...(contact.Email != null && { Email: contact.Email })
            }));
        }

        if (linkedContacts.length > 0 && input.confirm !== true) {
            return {
                deleted: false,
                blockedBy: 'linked_contacts',
                linkedContacts
            };
        }

        // https://www.bigin.com/developer/docs/apis/v2/delete-records.html
        await nango.delete({
            endpoint: `/bigin/v2/Accounts/${accountId}`,
            // Deleting an already-deleted account is not idempotent (a repeat call returns an error), so a retry after a lost response would repeat a destructive mutation.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        // https://www.bigin.com/developer/docs/apis/v2/get-records.html
        const verification = await nango.get({
            endpoint: `/bigin/v2/Accounts/${accountId}`,
            params: {
                fields: 'id'
            },
            retries: 3
        });

        if (verification.status !== 204) {
            throw new nango.ActionError({
                type: 'delete_not_confirmed',
                message: 'The account still exists after the delete request.',
                account_id: input.account_id
            });
        }

        return {
            deleted: true,
            cascadeDeletedContacts: linkedContacts
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
