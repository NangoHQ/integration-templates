import { createSync } from 'nango';
import type { ProxyConfiguration } from '@nangohq/runner-sdk';
import { z } from 'zod';

const RawContentTypeSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    group: z.string().optional().nullable(),
    hidden: z.boolean().optional().nullable(),
    readOnly: z.boolean().optional().nullable(),
    sealed: z.boolean().optional().nullable(),
    isBuiltIn: z.boolean().optional().nullable(),
    parentId: z.string().optional().nullable(),
    base: z
        .object({
            id: z.string().optional().nullable(),
            name: z.string().optional().nullable(),
            description: z.string().optional().nullable(),
            group: z.string().optional().nullable(),
            hidden: z.boolean().optional().nullable(),
            readOnly: z.boolean().optional().nullable(),
            sealed: z.boolean().optional().nullable()
        })
        .optional()
        .nullable()
});

const ContentTypeSchema = z.object({
    id: z.string(),
    siteId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    group: z.string().optional(),
    hidden: z.boolean().optional(),
    readOnly: z.boolean().optional(),
    sealed: z.boolean().optional(),
    isBuiltIn: z.boolean().optional(),
    parentId: z.string().optional(),
    base: z
        .object({
            id: z.string().optional(),
            name: z.string().optional(),
            description: z.string().optional(),
            group: z.string().optional(),
            hidden: z.boolean().optional(),
            readOnly: z.boolean().optional(),
            sealed: z.boolean().optional()
        })
        .optional()
});

const SiteSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    webUrl: z.string().optional().nullable()
});

const MetadataSchema = z.object({
    sites: z.array(z.string()).optional()
});

type ContentType = z.infer<typeof ContentTypeSchema>;

const sync = createSync({
    description: 'Sync content type definitions for configured sites.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/content-types' }],
    models: {
        ContentType: ContentTypeSchema
    },

    exec: async (nango) => {
        // Blocker: Microsoft Graph content types endpoint has no delta or changed-since filter.
        await nango.trackDeletesStart('ContentType');

        const metadataResult = await nango.getMetadata();
        const metadataParsed = MetadataSchema.safeParse(metadataResult);
        let siteIds: string[] | undefined;
        if (metadataParsed.success) {
            siteIds = metadataParsed.data.sites;
        }

        const sitesToFetch: Array<{ id: string }> = [];

        if (siteIds && siteIds.length > 0) {
            for (const siteId of siteIds) {
                sitesToFetch.push({ id: siteId });
            }
        } else {
            const siteDiscoveryConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/graph/api/site-search
                endpoint: '/v1.0/sites',
                params: {
                    search: '*'
                },
                paginate: {
                    type: 'link',
                    link_path_in_response_body: '@odata.nextLink',
                    response_path: 'value',
                    limit_name_in_request: '$top',
                    limit: 5
                },
                retries: 3
            };

            for await (const page of nango.paginate(siteDiscoveryConfig)) {
                for (const raw of page) {
                    const parsed = SiteSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Invalid site response: ${parsed.error.message}`);
                    }
                    sitesToFetch.push({ id: parsed.data.id });
                }
            }
        }

        for (const site of sitesToFetch) {
            const contentTypeConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/graph/api/site-list-contenttypes
                endpoint: `/v1.0/sites/${encodeURIComponent(site.id)}/contentTypes`,
                paginate: {
                    type: 'link',
                    link_path_in_response_body: '@odata.nextLink',
                    response_path: 'value',
                    limit_name_in_request: '$top',
                    limit: 100
                },
                retries: 3
            };

            for await (const page of nango.paginate(contentTypeConfig)) {
                const contentTypes: ContentType[] = [];
                for (const raw of page) {
                    const rawParsed = RawContentTypeSchema.safeParse(raw);
                    if (!rawParsed.success) {
                        throw new Error(`Invalid content type response: ${rawParsed.error.message}`);
                    }
                    const rawData = rawParsed.data;
                    const record: ContentType = {
                        id: `${site.id}|${rawData.id}`,
                        siteId: site.id,
                        ...(rawData.name != null && { name: rawData.name }),
                        ...(rawData.description != null && { description: rawData.description }),
                        ...(rawData.group != null && { group: rawData.group }),
                        ...(rawData.hidden != null && { hidden: rawData.hidden }),
                        ...(rawData.readOnly != null && { readOnly: rawData.readOnly }),
                        ...(rawData.sealed != null && { sealed: rawData.sealed }),
                        ...(rawData.isBuiltIn != null && { isBuiltIn: rawData.isBuiltIn }),
                        ...(rawData.parentId != null && { parentId: rawData.parentId }),
                        ...(rawData.base != null && {
                            base: {
                                ...(rawData.base.id != null && { id: rawData.base.id }),
                                ...(rawData.base.name != null && { name: rawData.base.name }),
                                ...(rawData.base.description != null && { description: rawData.base.description }),
                                ...(rawData.base.group != null && { group: rawData.base.group }),
                                ...(rawData.base.hidden != null && { hidden: rawData.base.hidden }),
                                ...(rawData.base.readOnly != null && { readOnly: rawData.base.readOnly }),
                                ...(rawData.base.sealed != null && { sealed: rawData.base.sealed })
                            }
                        })
                    };
                    contentTypes.push(record);
                }

                if (contentTypes.length > 0) {
                    await nango.batchSave(contentTypes, 'ContentType');
                }
            }
        }

        await nango.trackDeletesEnd('ContentType');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
