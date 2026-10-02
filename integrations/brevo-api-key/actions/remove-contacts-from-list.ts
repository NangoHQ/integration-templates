import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        listId: z.number().int().positive().describe('ID of the list to remove contacts from. Example: 2'),
        emails: z
            .array(z.string().email().describe('Email address of a contact to remove from the list.'))
            .min(1)
            .describe('Email addresses of the contacts to remove from the list. Example: ["jane@example.com"]')
    })
    .describe('Input for removing one or more contacts from a Brevo list by email.');

const ProviderRemoveResponseSchema = z.object({
    contacts: z
        .object({
            success: z.array(z.string()).optional(),
            failure: z.array(z.string()).optional()
        })
        .optional()
});

const OutputSchema = z
    .object({
        success: z
            .array(z.string().describe('Email address that was removed from the list.'))
            .describe('Email addresses that were successfully removed from the list.'),
        failure: z
            .array(z.string().describe('Email address that could not be removed from the list.'))
            .describe('Email addresses that could not be removed, for example unknown contacts or contacts that are not members of the list.')
    })
    .describe('Per-email result of the list removal request.');

/**
 * @tags: [write, destructive]
 * @tagReason: Removes contacts from a list, which mutates list memberships on the provider and revokes associations the provider cannot restore on its own.
 * @pitfalls: The request succeeds even when some emails cannot be removed, so check the failure array for per-email results instead of assuming all-or-nothing. Removal only detaches the contacts from the given list; the contacts themselves and their other list memberships are not affected.
 */
const action = createAction({
    description: 'Remove one or more contacts, identified by email, from a Brevo contact list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/removecontactfromlist
            endpoint: `/contacts/lists/${encodeURIComponent(String(input.listId))}/contacts/remove`,
            data: {
                emails: input.emails
            },
            // Removing list membership is state-idempotent (re-removing an already-removed contact changes nothing), so bounded retries are safe.
            retries: 3
        };
        const response = await nango.post(config);

        const parsed = ProviderRemoveResponseSchema.parse(response.data);

        return {
            success: parsed.contacts?.success ?? [],
            failure: parsed.contacts?.failure ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
