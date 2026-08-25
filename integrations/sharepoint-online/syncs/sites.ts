import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    siteIds: z.array(z.string()).optional(),
    sitePaths: z.array(z.string()).optional(),
    searchTerms: z.array(z.string()).optional()
});

const GraphSiteSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    description: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    siteCollection: z
        .object({
            hostname: z.string().optional()
        })
        .optional()
});

const SiteSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    description: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    siteCollectionHostname: z.string().optional()
});

const CheckpointStateSchema = z.object({
    phase: z.enum(['siteIds', 'sitePaths', 'searchTerms']),
    siteIdIndex: z.number().optional(),
    sitePathIndex: z.number().optional(),
    searchTermIndex: z.number().optional(),
    searchNextLink: z.string().optional()
});

const CheckpointSchema = z.object({
    state_json: z.string()
});

function parseCheckpointState(input: string | undefined): z.infer<typeof CheckpointStateSchema> {
    if (!input) {
        return { phase: 'siteIds' };
    }

    try {
        const parsed = JSON.parse(input);
        const result = CheckpointStateSchema.safeParse(parsed);
        if (result.success) {
            return result.data;
        }
    } catch {
        // Ignore malformed checkpoint data and restart from the beginning.
    }

    return { phase: 'siteIds' };
}

const sync = createSync({
    description: 'Sync targeted SharePoint sites.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Site: SiteSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/sites'
        }
    ],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const state = parseCheckpointState(checkpoint.success ? checkpoint.data['state_json'] : undefined);

        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new Error(`Invalid metadata: ${metadataResult.error.message}`);
        }

        const metadata = metadataResult.data;
        const siteIds = metadata.siteIds ?? [];
        const sitePaths = metadata.sitePaths ?? [];
        const searchTerms = metadata.searchTerms ?? [];

        if (siteIds.length === 0 && sitePaths.length === 0 && searchTerms.length === 0) {
            throw new Error('At least one of siteIds, sitePaths, or searchTerms must be provided in metadata.');
        }

        await nango.trackDeletesStart('Site');

        const savedIds = new Set<string>();
        let phase = state.phase;

        if (phase === 'siteIds') {
            const startIndex = state.siteIdIndex ?? 0;
            for (let i = startIndex; i < siteIds.length; i++) {
                const siteId = siteIds[i];
                if (!siteId) {
                    continue;
                }
                // https://learn.microsoft.com/graph/api/site-get
                const response = await nango.get({
                    endpoint: `/v1.0/sites/${encodeURIComponent(siteId)}`,
                    retries: 3
                });

                const parsed = GraphSiteSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Failed to parse site response for ID ${siteId}: ${parsed.error.message}`);
                }

                const site = parsed.data;
                if (!savedIds.has(site.id)) {
                    await nango.batchSave(
                        [
                            {
                                id: site.id,
                                ...(site.displayName != null && { displayName: site.displayName }),
                                ...(site.name != null && { name: site.name }),
                                ...(site.webUrl != null && { webUrl: site.webUrl }),
                                ...(site.description != null && { description: site.description }),
                                ...(site.createdDateTime != null && { createdDateTime: site.createdDateTime }),
                                ...(site.lastModifiedDateTime != null && { lastModifiedDateTime: site.lastModifiedDateTime }),
                                ...(site.siteCollection?.hostname != null && { siteCollectionHostname: site.siteCollection.hostname })
                            }
                        ],
                        'Site'
                    );
                    savedIds.add(site.id);
                }

                if (i + 1 < siteIds.length) {
                    await nango.saveCheckpoint({
                        state_json: JSON.stringify({ phase: 'siteIds', siteIdIndex: i + 1 })
                    });
                } else {
                    await nango.saveCheckpoint({
                        state_json: JSON.stringify({ phase: 'sitePaths', sitePathIndex: 0 })
                    });
                }
            }
            if (siteIds.length === 0) {
                await nango.saveCheckpoint({
                    state_json: JSON.stringify({ phase: 'sitePaths', sitePathIndex: 0 })
                });
            }
            phase = 'sitePaths';
        }

        if (phase === 'sitePaths') {
            const startIndex = state.sitePathIndex ?? 0;
            for (let i = startIndex; i < sitePaths.length; i++) {
                const sitePath = sitePaths[i];
                if (!sitePath) {
                    continue;
                }
                // https://learn.microsoft.com/graph/api/site-get
                const response = await nango.get({
                    endpoint: `/v1.0/sites/${encodeURIComponent(sitePath)}`,
                    retries: 3
                });

                const parsed = GraphSiteSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Failed to parse site response for path ${sitePath}: ${parsed.error.message}`);
                }

                const site = parsed.data;
                if (!savedIds.has(site.id)) {
                    await nango.batchSave(
                        [
                            {
                                id: site.id,
                                ...(site.displayName != null && { displayName: site.displayName }),
                                ...(site.name != null && { name: site.name }),
                                ...(site.webUrl != null && { webUrl: site.webUrl }),
                                ...(site.description != null && { description: site.description }),
                                ...(site.createdDateTime != null && { createdDateTime: site.createdDateTime }),
                                ...(site.lastModifiedDateTime != null && { lastModifiedDateTime: site.lastModifiedDateTime }),
                                ...(site.siteCollection?.hostname != null && { siteCollectionHostname: site.siteCollection.hostname })
                            }
                        ],
                        'Site'
                    );
                    savedIds.add(site.id);
                }

                if (i + 1 < sitePaths.length) {
                    await nango.saveCheckpoint({
                        state_json: JSON.stringify({ phase: 'sitePaths', sitePathIndex: i + 1 })
                    });
                } else {
                    await nango.saveCheckpoint({
                        state_json: JSON.stringify({ phase: 'searchTerms', searchTermIndex: 0 })
                    });
                }
            }
            if (sitePaths.length === 0) {
                await nango.saveCheckpoint({
                    state_json: JSON.stringify({ phase: 'searchTerms', searchTermIndex: 0 })
                });
            }
            phase = 'searchTerms';
        }

        if (phase === 'searchTerms') {
            const startIndex = state.searchTermIndex ?? 0;
            let nextLink: string | undefined = state.searchNextLink;

            for (let i = startIndex; i < searchTerms.length; i++) {
                const term = searchTerms[i];
                if (term === undefined) {
                    continue;
                }
                if (i !== startIndex) {
                    nextLink = undefined;
                }

                do {
                    const response = nextLink
                        ? await nango.get({
                              // https://learn.microsoft.com/graph/api/site-search
                              endpoint: `${new URL(nextLink).pathname}${new URL(nextLink).search}`,
                              retries: 3
                          })
                        : await nango.get({
                              // https://learn.microsoft.com/graph/api/site-search
                              endpoint: '/v1.0/sites',
                              params: {
                                  $top: '100',
                                  search: term
                              },
                              retries: 3
                          });

                    const pageSchema = z.object({
                        value: z.array(z.unknown()),
                        '@odata.nextLink': z.string().optional()
                    });
                    const pageParsed = pageSchema.safeParse(response.data);
                    if (!pageParsed.success) {
                        throw new Error(`Failed to parse site search response for term ${term}: ${pageParsed.error.message}`);
                    }

                    const page = pageParsed.data;

                    for (const raw of page.value) {
                        const searchItem = GraphSiteSchema.safeParse(raw);
                        if (!searchItem.success) {
                            throw new Error(`Failed to parse site search result for term ${term}: ${searchItem.error.message}`);
                        }

                        const result = searchItem.data;
                        if (!result.id) {
                            continue;
                        }

                        // https://learn.microsoft.com/graph/api/site-get
                        const detailResponse = await nango.get({
                            endpoint: `/v1.0/sites/${encodeURIComponent(result.id)}`,
                            retries: 3
                        });

                        const detailParsed = GraphSiteSchema.safeParse(detailResponse.data);
                        if (!detailParsed.success) {
                            throw new Error(`Failed to parse site detail response for ID ${result.id}: ${detailParsed.error.message}`);
                        }

                        const site = detailParsed.data;
                        if (!savedIds.has(site.id)) {
                            await nango.batchSave(
                                [
                                    {
                                        id: site.id,
                                        ...(site.displayName != null && { displayName: site.displayName }),
                                        ...(site.name != null && { name: site.name }),
                                        ...(site.webUrl != null && { webUrl: site.webUrl }),
                                        ...(site.description != null && { description: site.description }),
                                        ...(site.createdDateTime != null && { createdDateTime: site.createdDateTime }),
                                        ...(site.lastModifiedDateTime != null && { lastModifiedDateTime: site.lastModifiedDateTime }),
                                        ...(site.siteCollection?.hostname != null && { siteCollectionHostname: site.siteCollection.hostname })
                                    }
                                ],
                                'Site'
                            );
                            savedIds.add(site.id);
                        }
                    }

                    nextLink = page['@odata.nextLink'];

                    if (nextLink) {
                        await nango.saveCheckpoint({
                            state_json: JSON.stringify({
                                phase: 'searchTerms',
                                searchTermIndex: i,
                                searchNextLink: nextLink
                            })
                        });
                    } else if (i + 1 < searchTerms.length) {
                        await nango.saveCheckpoint({
                            state_json: JSON.stringify({
                                phase: 'searchTerms',
                                searchTermIndex: i + 1
                            })
                        });
                    }
                } while (nextLink);
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Site');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
