import { createSync } from 'nango';
import { z } from 'zod';

// Microsoft Graph Application response
// https://learn.microsoft.com/en-us/graph/api/resources/application
const ApplicationSchema = z.object({
    id: z.string(),
    appId: z.string(),
    displayName: z.string().optional().nullable(),
    createdDateTime: z.string().optional(),
    description: z.string().optional().nullable(),
    signInAudience: z.string().optional().nullable(),
    publisherDomain: z.string().optional().nullable()
});

type MicrosoftApplication = z.infer<typeof ApplicationSchema>;

const MicrosoftApplicationSchema = z.object({
    id: z.string(),
    appId: z.string().optional(),
    displayName: z.string().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    signInAudience: z.string().nullable().optional(),
    publisherDomain: z.string().nullable().optional(),
    '@removed': z
        .object({
            reason: z.string().optional()
        })
        .optional()
});

const DeltaResponseSchema = z.object({
    value: z.array(MicrosoftApplicationSchema),
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional()
});

const CheckpointSchema = z.object({
    deltaLink: z.string()
});

const APPLICATION_SELECT_FIELDS = 'id,appId,displayName,createdDateTime,description,signInAudience,publisherDomain';

function extractPathFromUrl(url: string): string {
    if (url.startsWith('https://')) {
        const urlObj = new URL(url);
        return `${urlObj.pathname}${urlObj.search}`;
    }

    return url;
}

const sync = createSync({
    description: 'Sync applications from Microsoft Graph',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        MicrosoftApplication: ApplicationSchema
    },
    // https://learn.microsoft.com/en-us/graph/api/application-list
    endpoints: [
        {
            path: '/syncs/applications',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let currentEndpoint = checkpoint?.deltaLink
            ? extractPathFromUrl(checkpoint.deltaLink)
            : `/v1.0/applications/delta?$select=${APPLICATION_SELECT_FIELDS}`;
        let lastDeltaLink = '';

        while (true) {
            const response = await nango.get({
                endpoint: currentEndpoint,
                retries: 3
            });

            const parsed = DeltaResponseSchema.parse(response.data);
            const upserts: MicrosoftApplication[] = [];
            const deletions: Array<{ id: string }> = [];

            for (const application of parsed.value) {
                if (application['@removed']) {
                    deletions.push({ id: application.id });
                    continue;
                }

                if (!application.appId) {
                    throw new Error(`Microsoft Graph delta response omitted appId for application ${application.id}`);
                }

                upserts.push({
                    id: application.id,
                    appId: application.appId,
                    ...(application.displayName != null && { displayName: application.displayName }),
                    ...(application.createdDateTime != null && { createdDateTime: application.createdDateTime }),
                    ...(application.description != null && { description: application.description }),
                    ...(application.signInAudience != null && { signInAudience: application.signInAudience }),
                    ...(application.publisherDomain != null && { publisherDomain: application.publisherDomain })
                });
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'MicrosoftApplication');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'MicrosoftApplication');
            }

            if (parsed['@odata.nextLink']) {
                currentEndpoint = extractPathFromUrl(parsed['@odata.nextLink']);
                continue;
            }

            lastDeltaLink = parsed['@odata.deltaLink'] ?? '';
            break;
        }

        if (lastDeltaLink) {
            await nango.saveCheckpoint({ deltaLink: lastDeltaLink });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
