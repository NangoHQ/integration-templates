import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderSubsiteSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    webUrl: z.string().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    lastModifiedDateTime: z.string().nullable().optional()
});

const SubsiteSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    parentSiteId: z.string().optional()
});

const SitesResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional()
});

const CheckpointSchema = z.object({
    phase: z.string(),
    rootsNextLink: z.string(),
    visitedJson: z.string(),
    queueJson: z.string(),
    currentSiteId: z.string(),
    currentSiteNextLink: z.string()
});

const EMPTY_CHECKPOINT = {
    phase: 'roots',
    rootsNextLink: '',
    visitedJson: '[]',
    queueJson: '[]',
    currentSiteId: '',
    currentSiteNextLink: ''
};

const sync = createSync({
    description: 'Sync subsites under selected parent sites.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Subsite: SubsiteSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/subsites'
        }
    ],

    exec: async (nango) => {
        // Blocker: Microsoft Graph /sites/{siteId}/sites does not expose a delta endpoint,
        // a changed-since filter, or a way to enumerate only modified or deleted subsites.
        // A full tree walk is required to detect deletions.
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const cp = parsedCheckpoint.success ? parsedCheckpoint.data : EMPTY_CHECKPOINT;

        await nango.trackDeletesStart('Subsite');

        const visited = new Set(z.array(z.string()).parse(JSON.parse(cp.visitedJson)));
        const queue: string[] = z.array(z.string()).parse(JSON.parse(cp.queueJson));
        let phase = cp.phase;
        let rootsNextLink = cp.rootsNextLink || undefined;

        // Phase 1: enumerate root sites
        if (phase === 'roots') {
            while (true) {
                const rootsConfig: ProxyConfiguration = {
                    // https://learn.microsoft.com/graph/api/site-list
                    endpoint: rootsNextLink ?? '/v1.0/sites',
                    retries: 3,
                    ...(rootsNextLink
                        ? {}
                        : {
                              params: {
                                  $select: 'id',
                                  $top: 100
                              }
                          })
                };

                const response = await nango.get(rootsConfig);
                const parsed = SitesResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Unexpected root sites response: ${parsed.error.message}`);
                }

                const page = parsed.data.value ?? [];
                for (const item of page) {
                    const itemParsed = z.object({ id: z.string() }).safeParse(item);
                    if (!itemParsed.success) {
                        throw new Error('Missing or invalid id in root site response');
                    }
                    const id = itemParsed.data.id;
                    if (!visited.has(id)) {
                        visited.add(id);
                        queue.push(id);
                    }
                }

                rootsNextLink = parsed.data['@odata.nextLink'];
                if (rootsNextLink) {
                    await nango.saveCheckpoint({
                        phase: 'roots',
                        rootsNextLink,
                        visitedJson: JSON.stringify([...visited]),
                        queueJson: JSON.stringify([...queue]),
                        currentSiteId: '',
                        currentSiteNextLink: ''
                    });
                } else {
                    phase = 'subsites';
                    await nango.saveCheckpoint({
                        phase: 'subsites',
                        rootsNextLink: '',
                        visitedJson: JSON.stringify([...visited]),
                        queueJson: JSON.stringify([...queue]),
                        currentSiteId: '',
                        currentSiteNextLink: ''
                    });
                    break;
                }
            }
        }

        // Phase 2: BFS over subsites
        let currentSiteId = cp.currentSiteId || undefined;
        let currentSiteNextLink = cp.currentSiteNextLink || undefined;

        while (queue.length > 0 || currentSiteId) {
            if (!currentSiteId) {
                const nextId = queue.shift();
                if (nextId === undefined) {
                    break;
                }
                currentSiteId = nextId;
                await nango.saveCheckpoint({
                    phase: 'subsites',
                    rootsNextLink: '',
                    visitedJson: JSON.stringify([...visited]),
                    queueJson: JSON.stringify([...queue]),
                    currentSiteId,
                    currentSiteNextLink: ''
                });
            }

            while (true) {
                const subsitesConfig: ProxyConfiguration = {
                    // https://learn.microsoft.com/graph/api/site-list-subsites
                    endpoint: currentSiteNextLink ?? `/v1.0/sites/${encodeURIComponent(currentSiteId)}/sites`,
                    retries: 3,
                    ...(currentSiteNextLink
                        ? {}
                        : {
                              params: {
                                  $select: 'id,name,displayName,description,webUrl,createdDateTime,lastModifiedDateTime',
                                  $top: 100
                              }
                          })
                };

                const response = await nango.get(subsitesConfig);
                const parsed = SitesResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Unexpected subsites response: ${parsed.error.message}`);
                }

                const page = parsed.data.value ?? [];
                const batchSubsites: Array<z.infer<typeof SubsiteSchema>> = [];

                for (const item of page) {
                    const itemParsed = ProviderSubsiteSchema.safeParse(item);
                    if (!itemParsed.success) {
                        throw new Error(`Failed to parse subsite: ${itemParsed.error.message}`);
                    }

                    const site = itemParsed.data;
                    batchSubsites.push({
                        id: site.id,
                        ...(site.name != null && { name: site.name }),
                        ...(site.displayName != null && { displayName: site.displayName }),
                        ...(site.description != null && { description: site.description }),
                        ...(site.webUrl != null && { webUrl: site.webUrl }),
                        ...(site.createdDateTime != null && { createdDateTime: site.createdDateTime }),
                        ...(site.lastModifiedDateTime != null && { lastModifiedDateTime: site.lastModifiedDateTime }),
                        parentSiteId: currentSiteId
                    });

                    if (!visited.has(site.id)) {
                        visited.add(site.id);
                        queue.push(site.id);
                    }
                }

                if (batchSubsites.length > 0) {
                    await nango.batchSave(batchSubsites, 'Subsite');
                }

                currentSiteNextLink = parsed.data['@odata.nextLink'];
                if (currentSiteNextLink) {
                    await nango.saveCheckpoint({
                        phase: 'subsites',
                        rootsNextLink: '',
                        visitedJson: JSON.stringify([...visited]),
                        queueJson: JSON.stringify([...queue]),
                        currentSiteId,
                        currentSiteNextLink
                    });
                } else {
                    currentSiteId = undefined;
                    currentSiteNextLink = undefined;
                    await nango.saveCheckpoint({
                        phase: 'subsites',
                        rootsNextLink: '',
                        visitedJson: JSON.stringify([...visited]),
                        queueJson: JSON.stringify([...queue]),
                        currentSiteId: '',
                        currentSiteNextLink: ''
                    });
                    break;
                }
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Subsite');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
