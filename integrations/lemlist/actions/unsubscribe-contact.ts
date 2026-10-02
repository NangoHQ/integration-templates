import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        value: z
            .string()
            .min(1)
            .describe('Value to suppress account-wide: an email address, domain, phone number, or LinkedIn URL. Example: "john.doe@example.com"')
    })
    .describe('Input for unsubscribing a value from all outreach');

const OutputSchema = z
    .object({
        _id: z.string().describe('Unique identifier of the unsubscribe record. Example: "uns_ZmzP7K61EMIT9fBSj"'),
        value: z.string().describe('The unsubscribed value (email, domain, phone number, or LinkedIn URL)'),
        variable: z.string().describe('Alias of value'),
        source: z.string().describe('Origin of the unsubscription. Known values: "api", "bounced", "lead", "user", "abuse"')
    })
    .describe('The created (or existing) account-wide unsubscribe record');

const ProviderUnsubscribeSchema = z.object({
    _id: z.string(),
    value: z.string(),
    variable: z.string(),
    source: z.string()
});

/**
 * @tags: [write, destructive]
 * @tagReason: Adds a value to the account-wide unsubscribe suppression list (write); the suppression blocks outreach to that value from every campaign and is difficult to reverse (destructive).
 * @pitfalls: Suppression is account-wide: the value cannot be added to or contacted from any campaign until it is resubscribed. Values that do not match a supported format (email, domain, phone number, LinkedIn URL) are not rejected upfront by the provider; they surface as an error from this action instead.
 */
const action = createAction({
    description:
        'Adds an email, domain, phone number, or LinkedIn URL to the account-wide unsubscribe suppression list. Idempotent: returns the existing record if the value is already unsubscribed.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.lemlist.com/api-reference/endpoints/unsubscribes/unsubscribe-variable
            // The value must NOT be URL-encoded in this path, unlike every other lemlist endpoint: the
            // percent-encoded form is silently accepted (200) but skipped, because the server validates
            // the still-encoded string.
            endpoint: `/api/v2/unsubscribes/variables/${input.value}`,
            // Safe to retry: lemlist documents this operation as idempotent (an already-unsubscribed
            // value returns the existing record), so a repeated POST does not repeat the mutation.
            retries: 3
        };

        const response = await nango.post(config);

        // lemlist answers ineligible values with HTTP 200 and a {"skipped": true, ...} body instead of
        // an error, so a successful status alone does not prove the suppression was created.
        const parsed = ProviderUnsubscribeSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'unsubscribe_skipped',
                message: 'lemlist did not unsubscribe the value; it may be ineligible. Expected an email, domain, phone number, or LinkedIn URL.',
                value: input.value
            });
        }

        return {
            _id: parsed.data._id,
            value: parsed.data.value,
            variable: parsed.data.variable,
            source: parsed.data.source
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
