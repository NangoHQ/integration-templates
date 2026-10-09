import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        account_id: z.string().describe('Unique ID of the account to delete. Example: "7618134000000632027"')
    })
    .describe('The account to permanently delete');

const ProviderDeleteAccountResponseSchema = z.object({
    data: z.array(
        z.object({
            code: z.string().optional(),
            details: z
                .object({
                    id: z.string().optional()
                })
                .optional(),
            message: z.string().optional(),
            status: z.string().optional()
        })
    )
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique ID of the account that was permanently deleted. Example: "7618134000000632027"'),
        success: z.boolean().describe('True once the provider confirms the account was deleted.'),
        message: z.string().describe('Provider confirmation message, for example "record deleted".')
    })
    .describe('The result of the account deletion');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes an account through the provider's delete endpoint, an irreversible provider mutation.
 * @pitfalls: Deleting an account cascade-deletes every Contact linked to it (via Account_Name) rather than merely unlinking them, and deleting an unknown or malformed account ID fails with a provider error rather than succeeding idempotently.
 */
const action = createAction({
    description:
        'Permanently delete a single account by ID. WARNING: confirmed live to cascade-delete every Contact currently linked to it - see comments before using this directly.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.accounts.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.bigin.com/developer/docs/apis/delete-records.html
            endpoint: `/bigin/v2/Accounts/${encodeURIComponent(input.account_id)}`,
            // Retrying a delete is safe for provider state (removing an already-deleted record is a no-op), but this API
            // errors on a repeat delete, so keep retries low to cover only transient 5xx/network failures.
            retries: 1
        };

        const response = await nango.delete(config);
        const parsed = ProviderDeleteAccountResponseSchema.parse(response.data);
        const result = parsed.data[0];

        if (!result) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'The provider did not return a delete confirmation for the account.',
                account_id: input.account_id
            });
        }

        return {
            id: result.details?.id ?? input.account_id,
            success: true,
            message: result.message ?? 'record deleted'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
