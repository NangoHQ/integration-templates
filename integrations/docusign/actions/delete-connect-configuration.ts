import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    connectId: z.string().describe('Connect configuration ID to delete. Example: "22210640"')
});

const OutputSchema = z.object({
    success: z.literal(true)
});

const MetadataSchema = z.object({
    accountId: z.string()
});

const action = createAction({
    description: 'Delete a Connect webhook configuration',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    endpoint: {
        path: '/actions/delete-connect-configuration',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const accountId = metadata.accountId;

        // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/connectconfigurations/delete/
        await nango.delete({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/connect/${encodeURIComponent(input.connectId)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
