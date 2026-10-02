import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        value: z
            .string()
            .describe(
                'The value to remove from the account-wide unsubscribe list: an email address, domain, phone number, or LinkedIn URL. Example: "john.doe@example.com"'
            )
    })
    .describe('Input for resubscribing a value to the account.');

const OutputSchema = z
    .object({
        _id: z.string().describe('Unique identifier of the removed unsubscribe entry. Example: "uns_QCXCLzEfEuEOlCVIu"'),
        value: z.string().describe('The value that was removed from the unsubscribe list. Example: "john.doe@example.com"')
    })
    .describe('The unsubscribe entry that was removed.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an existing entry from the provider's account-wide unsubscribe list, a provider-side delete mutation.
 * @pitfalls: Resubscribing is account-wide and takes effect immediately, so the value can be added to any campaign again right away. If the value is not currently on the unsubscribe list, the call fails with a 404 "Unsubscribe not found" error rather than being a no-op.
 */
const action = createAction({
    description: 'Removes an email address, domain, phone number, or LinkedIn URL from the account-wide unsubscribe list, undoing a prior unsubscribe.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.lemlist.com/api-reference/endpoints/unsubscribes/delete-unsubscribe-email
            endpoint: `/api/unsubscribes/${encodeURIComponent(input.value)}`,
            retries: 3
        };
        const response = await nango.delete(config);

        const parsed = OutputSchema.parse(response.data);

        return {
            _id: parsed._id,
            value: parsed.value
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
