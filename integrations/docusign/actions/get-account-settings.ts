import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const MetadataSchema = z.object({
    accountId: z.string().min(1)
});

const ProviderSettingsSchema = z.object({}).passthrough();

const OutputSchema = z.object({}).passthrough();

const action = createAction({
    description: 'Retrieve all account-level settings and feature flags.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/get-account-settings',
        method: 'GET'
    },

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const accountId = parsedMetadata.data.accountId;

        const response = await nango.get({
            // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/accounts/listsettings/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/settings`,
            retries: 3
        });

        const providerSettings = ProviderSettingsSchema.parse(response.data);

        return providerSettings;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
