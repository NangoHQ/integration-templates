import { createSync } from 'nango';
import { z } from 'zod';

const ServicePrincipalSchema = z.object({
    id: z.string(),
    appId: z.string().optional(),
    displayName: z.string().optional(),
    createdDateTime: z.string().optional()
});

type ServicePrincipal = z.infer<typeof ServicePrincipalSchema>;

const MicrosoftServicePrincipalSchema = z.object({
    id: z.string(),
    appId: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    '@removed': z
        .object({
            reason: z.string().optional()
        })
        .optional()
});

const DeltaResponseSchema = z.object({
    value: z.array(MicrosoftServicePrincipalSchema),
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional()
});

const CheckpointSchema = z.object({
    deltaLink: z.string()
});

const SERVICE_PRINCIPAL_SELECT_FIELDS = 'id,appId,displayName,createdDateTime';

function extractPathFromUrl(url: string): string {
    if (url.startsWith('https://')) {
        const urlObj = new URL(url);
        return `${urlObj.pathname}${urlObj.search}`;
    }

    return url;
}

const sync = createSync({
    description: 'Sync service principals from Microsoft Graph',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ServicePrincipal: ServicePrincipalSchema
    },
    endpoints: [
        {
            path: '/syncs/service-principals',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let currentEndpoint = checkpoint?.deltaLink
            ? extractPathFromUrl(checkpoint.deltaLink)
            : `/v1.0/servicePrincipals/delta?$select=${SERVICE_PRINCIPAL_SELECT_FIELDS}`;
        let lastDeltaLink = '';

        while (true) {
            const response = await nango.get({
                endpoint: currentEndpoint,
                retries: 3
            });

            const parsed = DeltaResponseSchema.parse(response.data);
            const upserts: ServicePrincipal[] = [];
            const deletions: Array<{ id: string }> = [];

            for (const servicePrincipal of parsed.value) {
                if (servicePrincipal['@removed']) {
                    deletions.push({ id: servicePrincipal.id });
                    continue;
                }

                upserts.push({
                    id: servicePrincipal.id,
                    ...(servicePrincipal.appId != null && { appId: servicePrincipal.appId }),
                    ...(servicePrincipal.displayName != null && { displayName: servicePrincipal.displayName }),
                    ...(servicePrincipal.createdDateTime != null && { createdDateTime: servicePrincipal.createdDateTime })
                });
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'ServicePrincipal');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'ServicePrincipal');
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

export default sync;
