import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required. The full account-wide unsubscribe list is always returned.');

const UnsubscribeSchema = z.object({
    _id: z.string().describe('Unique identifier of the unsubscribe record. Example: "uns_ZmzP7K61EMIT9fBSj".'),
    createdAt: z.string().describe('ISO 8601 timestamp of when the value was suppressed. Example: "2023-06-12T10:45:21.367Z".'),
    value: z.string().describe('The suppressed value: an email address, domain, phone number, or LinkedIn URL. Example: "john.doe@example.com".'),
    source: z.string().describe('How the suppression was created, e.g. "api" or "user".')
});

const ProviderUnsubscribeSchema = z.object({
    _id: z.string(),
    createdAt: z.string(),
    value: z.string(),
    source: z.string()
});

const OutputSchema = z
    .object({
        unsubscribes: z.array(UnsubscribeSchema).describe('Every account-wide unsubscribed/suppressed value on the lemlist account.')
    })
    .describe('The full account-wide unsubscribe list.');

/**
 * @tags: [read]
 * @tagReason: Only performs read-only GET calls against the unsubscribe list; nothing is created, modified, or deleted on the provider.
 * @pitfalls: lemlist marks the list API behind this action as legacy, so it may change or be removed by the provider in the future. Values are account-wide suppressions that can also be created as a side effect of removing a lead from a campaign, not only by explicit unsubscribe requests.
 */
const action = createAction({
    description: 'List every account-wide unsubscribed/suppressed value (email, domain, phone, or LinkedIn URL).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const pageLimit = 100;
        const unsubscribes: z.infer<typeof UnsubscribeSchema>[] = [];
        let offset = 0;
        let fetched = 0;

        do {
            // https://developer.lemlist.com/api-reference/endpoints/unsubscribes/get-many-unsubscribes
            const response = await nango.get({
                endpoint: '/api/unsubscribes',
                params: {
                    limit: pageLimit,
                    offset: offset
                },
                retries: 3
            });

            const page = z.array(ProviderUnsubscribeSchema).parse(response.data);
            unsubscribes.push(...page);
            fetched = page.length;
            offset += page.length;
        } while (fetched === pageLimit);

        return { unsubscribes };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
