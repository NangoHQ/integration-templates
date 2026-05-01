import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    comment_id: z.string().describe('The ID of the footer comment to delete. Example: "12345"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    comment_id: z.string()
});

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const AccessibleResourceSchema = z.object({
    id: z.string(),
    url: z.string().optional(),
    name: z.string().optional(),
    scopes: z.array(z.string()).optional(),
    avatarUrl: z.string().optional()
});

const action = createAction({
    description: 'Permanently delete a Confluence footer comment.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-footer-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['read:space:confluence', 'read:comment:confluence', 'write:comment:confluence', 'delete:comment:confluence'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config;
        let cloudId: string | undefined = connectionConfig?.['cloudId'];

        if (!cloudId) {
            const metadata = await nango.getMetadata();
            cloudId = metadata?.cloudId;
        }

        if (!cloudId) {
            const accessibleResourcesResponse = await nango.get({
                // https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/#2-get-the-cloudid-for-the-site
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const resources = z.array(AccessibleResourceSchema).safeParse(accessibleResourcesResponse.data);
            if (!resources.success || resources.data.length === 0) {
                throw new nango.ActionError({
                    type: 'cloud_id_not_found',
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

        const baseUrlOverride = `https://api.atlassian.com/ex/confluence/${cloudId}`;

        await nango.delete({
            // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-comment/#api-wiki-api-v2-footer-comments-comment-id-delete
            endpoint: `/wiki/api/v2/footer-comments/${input.comment_id}`,
            baseUrlOverride,
            retries: 1
        });

        return {
            success: true,
            comment_id: input.comment_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
