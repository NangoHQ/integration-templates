import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    commentId: z.string().describe('The ID of the inline comment to delete. Example: "123456789"')
});

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const AccessibleResourcesResponseSchema = z.array(
    z.object({
        id: z.string()
    })
);

const action = createAction({
    description: 'Permanently delete a Confluence inline comment.',
    version: '1.0.1',
    input: InputSchema,
    output: z.null(),
    metadata: MetadataSchema,
    scopes: ['delete:comment:confluence'],

    exec: async (nango, input): Promise<null> => {
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config;

        let cloudId: string | undefined;
        if (
            typeof connectionConfig === 'object' &&
            connectionConfig !== null &&
            'cloudId' in connectionConfig &&
            typeof connectionConfig['cloudId'] === 'string'
        ) {
            cloudId = connectionConfig['cloudId'];
        }

        if (!cloudId) {
            const metadata = MetadataSchema.parse((await nango.getMetadata()) ?? {});
            cloudId = metadata.cloudId;
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/#3--access-granted
            const response = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const resources = AccessibleResourcesResponseSchema.safeParse(response.data);
            if (!resources.success || resources.data.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_cloud_id',
                    message: 'Could not resolve Confluence cloud ID from accessible resources.'
                });
            }
            if (resources.data.length > 1) {
                throw new nango.ActionError({
                    type: 'ambiguous_cloud_id',
                    message: 'Multiple Confluence sites found. Please set an explicit cloudId in the connection metadata.'
                });
            }

            cloudId = resources.data[0]!.id;
            await nango.updateMetadata({ cloudId });
        }

        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-comment/#api-inline-comments-comment-id-delete
        await nango.delete({
            endpoint: `/wiki/api/v2/inline-comments/${input.commentId}`,
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
            retries: 1
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
