import { z } from 'zod';
import { createAction } from 'nango';

const AccountSettingItemSchema = z.object({
    id: z.number().describe('Unique identifier for the account setting row.'),
    type: z.string().describe('Setting type identifier, such as "ticket-assignment" or "business-hours".'),
    data: z.record(z.string(), z.unknown()).describe('Setting-specific configuration object whose shape depends on the setting type.')
});

const InputSchema = z.object({}).describe('No input required for this action.');

const OutputSchema = z
    .object({
        settings: z.array(AccountSettingItemSchema).describe('List of account-level settings rows, one per setting type.')
    })
    .describe(
        'Account-level settings including business hours, ticket assignment, satisfaction survey config, access/SSO, auto-merge, auto-split, default integration, etc.'
    );

/**
 * @tags: [read]
 * @tagReason: Reads account-level settings from the provider.
 * @pitfalls: The `data` field shape varies by `type`; callers must handle each setting type's unique structure individually.
 */
const action = createAction({
    description:
        'List account-level settings (business hours, ticket assignment, satisfaction survey config, access/SSO, auto-merge, auto-split, default integration, etc.).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/get-account-settings
            endpoint: '/api/account/settings',
            retries: 3
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object' || !Array.isArray(rawData.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from account settings endpoint'
            });
        }

        const settings = rawData.data.map((item: unknown) => {
            const parsed = AccountSettingItemSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response_item',
                    message: 'Failed to parse an account setting item',
                    item: item
                });
            }
            return parsed.data;
        });

        return { settings };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
