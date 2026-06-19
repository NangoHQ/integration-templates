import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    spaceId: z.string().describe('Space ID. Example: "123456"'),
    parentId: z.string().optional().describe('Parent page ID. Example: "987654"'),
    title: z.string().describe('Page title. Example: "My New Page"'),
    status: z.string().optional().describe('Page status. Example: "current" or "draft".'),
    body: z.string().optional().describe('Page body in storage format. Example: "<p>Hello world</p>"')
});

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const ProviderPageSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    title: z.string().optional(),
    spaceId: z.string().optional(),
    parentId: z.string().optional(),
    parentType: z.string().optional(),
    position: z.number().optional(),
    authorId: z.string().optional(),
    ownerId: z.string().optional(),
    lastOwnerId: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    version: z
        .object({
            createdAt: z.string().optional(),
            message: z.string().optional(),
            number: z.number().optional(),
            minorEdit: z.boolean().optional(),
            authorId: z.string().optional()
        })
        .optional(),
    body: z
        .object({
            storage: z.record(z.string(), z.unknown()).optional(),
            atlas_doc_format: z.record(z.string(), z.unknown()).optional(),
            view: z.record(z.string(), z.unknown()).optional()
        })
        .optional(),
    _links: z
        .object({
            webui: z.string().optional(),
            editui: z.string().optional(),
            tinyui: z.string().optional(),
            base: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    title: z.string().optional(),
    spaceId: z.string().optional(),
    parentId: z.string().optional(),
    parentType: z.string().optional(),
    position: z.number().optional(),
    authorId: z.string().optional(),
    ownerId: z.string().optional(),
    lastOwnerId: z.string().optional(),
    createdAt: z.string().optional(),
    version: z
        .object({
            createdAt: z.string().optional(),
            message: z.string().optional(),
            number: z.number().optional(),
            minorEdit: z.boolean().optional(),
            authorId: z.string().optional()
        })
        .optional(),
    body: z
        .object({
            storage: z.record(z.string(), z.unknown()).optional(),
            atlasDocFormat: z.record(z.string(), z.unknown()).optional(),
            view: z.record(z.string(), z.unknown()).optional()
        })
        .optional(),
    links: z
        .object({
            webui: z.string().optional(),
            editui: z.string().optional(),
            tinyui: z.string().optional(),
            base: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a Confluence page in a space.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['write:page:confluence', 'read:space:confluence'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfigSchema = z.object({
            cloudId: z.string().optional()
        });
        const connectionConfig = connectionConfigSchema.safeParse(connection.connection_config);
        let cloudId = connectionConfig.success ? connectionConfig.data.cloudId : undefined;

        if (!cloudId) {
            const metadata = await nango.getMetadata();
            cloudId = metadata.cloudId;

            if (!cloudId) {
                const accessibleResourcesConfig: ProxyConfiguration = {
                    // https://developer.atlassian.com/cloud/confluence/rest/v2/intro/#auth
                    endpoint: 'oauth/token/accessible-resources',
                    baseUrlOverride: 'https://api.atlassian.com',
                    retries: 3
                };

                const accessibleResources = await nango.get(accessibleResourcesConfig);

                const resourcesSchema = z.array(z.record(z.string(), z.unknown()));
                const resources = resourcesSchema.safeParse(accessibleResources.data);
                if (!resources.success || !resources.data || resources.data.length === 0) {
                    throw new nango.ActionError({
                        type: 'not_found',
                        message: 'No accessible Confluence resources found for this connection.'
                    });
                }

                const firstResourceSchema = z.object({
                    id: z.string()
                });
                const firstResource = firstResourceSchema.safeParse(resources.data[0]);
                if (!firstResource.success) {
                    throw new nango.ActionError({
                        type: 'invalid_response',
                        message: 'Accessible resources response missing id field.'
                    });
                }

                cloudId = firstResource.data.id;
                await nango.updateMetadata({ cloudId });
            }
        }

        const requestBody: Record<string, unknown> = {
            spaceId: input.spaceId,
            title: input.title
        };

        if (input.status !== undefined) {
            requestBody['status'] = input.status;
        }

        if (input.parentId !== undefined) {
            requestBody['parentId'] = input.parentId;
        }

        if (input.body !== undefined) {
            requestBody['body'] = {
                representation: 'storage',
                value: input.body
            };
        }

        const createConfig: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-post
            endpoint: '/wiki/api/v2/pages',
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
            data: requestBody,
            retries: 1
        };

        const response = await nango.post(createConfig);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Empty response from Confluence API.'
            });
        }

        const providerPage = ProviderPageSchema.parse(response.data);

        return {
            id: providerPage.id,
            ...(providerPage.status != null && { status: providerPage.status }),
            ...(providerPage.title != null && { title: providerPage.title }),
            ...(providerPage.spaceId != null && { spaceId: providerPage.spaceId }),
            ...(providerPage.parentId != null && { parentId: providerPage.parentId }),
            ...(providerPage.parentType != null && { parentType: providerPage.parentType }),
            ...(providerPage.position != null && { position: providerPage.position }),
            ...(providerPage.authorId != null && { authorId: providerPage.authorId }),
            ...(providerPage.ownerId != null && { ownerId: providerPage.ownerId }),
            ...(providerPage.lastOwnerId != null && { lastOwnerId: providerPage.lastOwnerId }),
            ...(providerPage.createdAt != null && { createdAt: providerPage.createdAt }),
            ...(providerPage.version != null && {
                version: {
                    ...(providerPage.version.createdAt != null && { createdAt: providerPage.version.createdAt }),
                    ...(providerPage.version.message != null && { message: providerPage.version.message }),
                    ...(providerPage.version.number != null && { number: providerPage.version.number }),
                    ...(providerPage.version.minorEdit != null && { minorEdit: providerPage.version.minorEdit }),
                    ...(providerPage.version.authorId != null && { authorId: providerPage.version.authorId })
                }
            }),
            ...(providerPage.body != null && {
                body: {
                    ...(providerPage.body.storage != null && { storage: providerPage.body.storage }),
                    ...(providerPage.body.atlas_doc_format != null && { atlasDocFormat: providerPage.body.atlas_doc_format }),
                    ...(providerPage.body.view != null && { view: providerPage.body.view })
                }
            }),
            ...(providerPage._links != null && {
                links: {
                    ...(providerPage._links.webui != null && { webui: providerPage._links.webui }),
                    ...(providerPage._links.editui != null && { editui: providerPage._links.editui }),
                    ...(providerPage._links.tinyui != null && { tinyui: providerPage._links.tinyui }),
                    ...(providerPage._links.base != null && { base: providerPage._links.base })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
