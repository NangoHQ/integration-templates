import { createSync } from 'nango';
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

const SiteListResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional()
});

const ContentTypeListResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional()
});

type ContentType = z.infer<typeof ContentTypeSchema>;

const CheckpointStateSchema = z.object({
    sites: z.array(z.string()).optional(),
    siteNextLink: z.string().optional(),
    siteIndex: z.number().int().nonnegative().optional(),
    contentTypeNextLink: z.string().optional()
});

type CheckpointState = z.infer<typeof CheckpointStateSchema>;

const CheckpointSchema = z.object({
    stateJson: z.string()
});

function parseStateJson(input: string | undefined): CheckpointState {
    if (!input) {
        return {};
    }

    try {
        const parsed = JSON.parse(input);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }
        const result = CheckpointStateSchema.safeParse(parsed);
        if (result.success) {
            return result.data;
        }
    } catch {
        // Ignore malformed checkpoint data and restart.
    }

    return {};
}

function toRelativeUrl(url: string): string {
    if (!url.startsWith('http')) {
        return url;
    }

    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
}

const sync = createSync({
    description: 'Sync content type definitions for configured sites.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'GET', path: '/syncs/content-types' }],
    models: {
        ContentType: ContentTypeSchema
    },

    exec: async (nango) => {
        // Blocker: Microsoft Graph content types endpoint has no delta or changed-since filter.
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.safeParse(checkpointRaw);
        const state = parseStateJson(checkpoint.success ? checkpoint.data.stateJson : undefined);

        const metadataResult = await nango.getMetadata();
        const metadataParsed = MetadataSchema.safeParse(metadataResult);
        let metadataSiteIds: string[] | undefined;
        if (metadataParsed.success) {
            metadataSiteIds = metadataParsed.data.sites;
        }

        await nango.trackDeletesStart('ContentType');

        let sites: string[];
        let siteIndex: number;
        let contentTypeNextLink: string | undefined;

        if (metadataSiteIds && metadataSiteIds.length > 0) {
            sites = metadataSiteIds;
            if (!state.siteNextLink && state.siteIndex !== undefined && state.siteIndex < sites.length) {
                siteIndex = state.siteIndex;
                contentTypeNextLink = state.contentTypeNextLink;
            } else {
                siteIndex = 0;
                contentTypeNextLink = undefined;
            }
        } else if (state.siteNextLink) {
            // Resume site discovery.
            const discoveredSites: string[] = state.sites ?? [];
            let nextUrl: string | undefined = state.siteNextLink;

            while (nextUrl) {
                // https://learn.microsoft.com/graph/api/site-search
                const response = await nango.get({
                    endpoint: toRelativeUrl(nextUrl),
                    retries: 3
                });

                const parsed = SiteListResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Invalid site list response: ${parsed.error.message}`);
                }

                for (const raw of parsed.data.value) {
                    const siteParsed = SiteSchema.safeParse(raw);
                    if (!siteParsed.success) {
                        throw new Error(`Invalid site response: ${siteParsed.error.message}`);
                    }
                    discoveredSites.push(siteParsed.data.id);
                }

                if (parsed.data['@odata.nextLink']) {
                    nextUrl = parsed.data['@odata.nextLink'];
                    await nango.saveCheckpoint({
                        stateJson: JSON.stringify({
                            sites: discoveredSites,
                            siteNextLink: toRelativeUrl(nextUrl)
                        })
                    });
                } else {
                    nextUrl = undefined;
                }
            }

            sites = discoveredSites;
            siteIndex = 0;
            contentTypeNextLink = undefined;
            await nango.saveCheckpoint({
                stateJson: JSON.stringify({
                    sites: discoveredSites,
                    siteIndex: 0
                })
            });
        } else if (state.sites) {
            sites = state.sites;
            siteIndex = state.siteIndex ?? 0;
            contentTypeNextLink = state.contentTypeNextLink;
        } else {
            // Fresh start: discover all sites.
            const discoveredSites: string[] = [];
            let nextUrl: string | undefined = '/v1.0/sites?search=*&$top=5';

            while (nextUrl) {
                // https://learn.microsoft.com/graph/api/site-search
                const response = await nango.get({
                    endpoint: toRelativeUrl(nextUrl),
                    retries: 3
                });

                const parsed = SiteListResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Invalid site list response: ${parsed.error.message}`);
                }

                for (const raw of parsed.data.value) {
                    const siteParsed = SiteSchema.safeParse(raw);
                    if (!siteParsed.success) {
                        throw new Error(`Invalid site response: ${siteParsed.error.message}`);
                    }
                    discoveredSites.push(siteParsed.data.id);
                }

                if (parsed.data['@odata.nextLink']) {
                    nextUrl = parsed.data['@odata.nextLink'];
                    await nango.saveCheckpoint({
                        stateJson: JSON.stringify({
                            sites: discoveredSites,
                            siteNextLink: toRelativeUrl(nextUrl)
                        })
                    });
                } else {
                    nextUrl = undefined;
                }
            }

            sites = discoveredSites;
            siteIndex = 0;
            contentTypeNextLink = undefined;
            await nango.saveCheckpoint({
                stateJson: JSON.stringify({
                    sites: discoveredSites,
                    siteIndex: 0
                })
            });
        }

        for (let i = siteIndex; i < sites.length; i++) {
            const siteId = sites[i]!;
            let nextUrl: string | undefined = contentTypeNextLink ?? `/v1.0/sites/${encodeURIComponent(siteId)}/contentTypes?$top=100`;

            while (nextUrl) {
                // https://learn.microsoft.com/graph/api/site-list-contenttypes
                const response = await nango.get({
                    endpoint: toRelativeUrl(nextUrl),
                    retries: 3
                });

                const parsed = ContentTypeListResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Invalid content type list response: ${parsed.error.message}`);
                }

                const contentTypes: ContentType[] = [];
                for (const raw of parsed.data.value) {
                    const rawParsed = RawContentTypeSchema.safeParse(raw);
                    if (!rawParsed.success) {
                        throw new Error(`Invalid content type response: ${rawParsed.error.message}`);
                    }
                    const rawData = rawParsed.data;
                    const record: ContentType = {
                        id: `${siteId}|${rawData.id}`,
                        siteId,
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

                if (parsed.data['@odata.nextLink']) {
                    nextUrl = parsed.data['@odata.nextLink'];
                    await nango.saveCheckpoint({
                        stateJson: JSON.stringify({
                            sites,
                            siteIndex: i,
                            contentTypeNextLink: toRelativeUrl(nextUrl)
                        })
                    });
                } else {
                    nextUrl = undefined;
                }
            }

            contentTypeNextLink = undefined;
            await nango.saveCheckpoint({
                stateJson: JSON.stringify({
                    sites,
                    siteIndex: i + 1
                })
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ContentType');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
