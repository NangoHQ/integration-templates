import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        accountId: z.string().describe('The unique identifier (GUID) of the account to delete. Example: "3f2504e0-4f89-11d3-9a0c-0305e82c3301"')
    })
    .describe('Input required to delete an account');

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether the account was deleted successfully'),
        id: z.string().describe('The unique identifier (GUID) of the deleted account')
    })
    .describe('Result of the account deletion');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an account record from Dataverse, which permanently removes provider data (an irreversible provider mutation).
 * @pitfalls: Deletion is permanent and irreversible: Dataverse has no soft-delete or recycle bin, and the account returns a 404 immediately afterwards. Related records (such as contacts parented to the account) may be cascade-deleted or may block the deletion, depending on each relationship's configured cascade behavior.
 */
const action = createAction({
    description: 'Delete an account',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_impersonation'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/update-delete-entities-using-web-api#delete-a-single-entity
            endpoint: `/api/data/v9.2/accounts(${encodeURIComponent(input.accountId)})`,
            // No retries: a retry after a lost 204 response would hit a 404 on the already-deleted record (the delete truly succeeded, but the SDK
            // surfaces the retry's 404 as a failure), so retrying here would report a spurious error.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        const response = await nango.delete(config);

        return {
            success: response.status === 204,
            id: input.accountId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
