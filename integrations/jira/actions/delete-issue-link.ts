import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    linkId: z.string().describe('The ID of the issue link to delete. Example: "10001"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    linkId: z.string()
});

const action = createAction({
    description: 'Delete a link between Jira issues',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        let cloudId = connection.connection_config?.['cloudId'];

        if (!cloudId) {
            const metadata = await nango.getMetadata();
            const metadataCloudId = z.object({ cloudId: z.string().optional() }).parse(metadata);
            cloudId = metadataCloudId.cloudId;
        }

        if (!cloudId) {
            throw new nango.ActionError({
                type: 'missing_cloud_id',
                message: 'Missing cloudId in connection configuration'
            });
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-links/#api-rest-api-3-issuelink-linkid-delete
        await nango.delete({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issueLink/${input.linkId}`,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 1
        });

        return {
            success: true,
            linkId: input.linkId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
