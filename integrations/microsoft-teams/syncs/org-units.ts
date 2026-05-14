import { createSync } from 'nango';
import { z } from 'zod';

const OrgUnitSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    mail: z.string().optional(),
    mailNickname: z.string().optional(),
    groupTypes: z.array(z.string()).optional(),
    securityEnabled: z.boolean().optional(),
    mailEnabled: z.boolean().optional(),
    visibility: z.string().optional(),
    createdDateTime: z.string().optional(),
    renewedDateTime: z.string().optional(),
    expirationDateTime: z.string().optional(),
    classification: z.string().optional()
});

const CheckpointSchema = z.object({
    deltaLink: z.string()
});

const ProviderGroupSchema = z.object({
    id: z.string(),
    displayName: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    mail: z.string().nullable().optional(),
    mailNickname: z.string().nullable().optional(),
    groupTypes: z.array(z.string()).optional(),
    securityEnabled: z.boolean().optional(),
    mailEnabled: z.boolean().optional(),
    visibility: z.string().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    renewedDateTime: z.string().nullable().optional(),
    expirationDateTime: z.string().nullable().optional(),
    classification: z.string().nullable().optional(),
    '@removed': z.object({}).passthrough().optional()
});

const DeltaResponseSchema = z.object({
    value: z.array(ProviderGroupSchema),
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional()
});

function buildGraphRequest(endpointOrUrl: string, defaultParams?: Record<string, string>) {
    if (!endpointOrUrl.includes('?')) {
        return {
            endpoint: endpointOrUrl,
            ...(defaultParams ? { params: defaultParams } : {})
        };
    }

    const isAbsoluteUrl = endpointOrUrl.startsWith('http');
    const url = new URL(isAbsoluteUrl ? endpointOrUrl : `https://graph.microsoft.com${endpointOrUrl}`);
    const params = Object.fromEntries(url.searchParams.entries());

    return {
        endpoint: url.pathname,
        ...(isAbsoluteUrl ? { baseUrlOverride: url.origin } : {}),
        ...(Object.keys(params).length > 0 ? { params } : {})
    };
}

const sync = createSync({
    description: 'Sync Microsoft 365 or Entra groups used as organizational units',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/org-units',
            method: 'POST'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        OrgUnit: OrgUnitSchema
    },
    scopes: ['GroupMember.Read.All'],

    exec: async (nango) => {
        const checkpointResult = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpointResult);
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : { deltaLink: '' };

        const selectFields = [
            'id',
            'displayName',
            'description',
            'mail',
            'mailNickname',
            'groupTypes',
            'securityEnabled',
            'mailEnabled',
            'visibility',
            'createdDateTime',
            'renewedDateTime',
            'expirationDateTime',
            'classification'
        ].join(',');

        let cursor = checkpoint.deltaLink || '/v1.0/groups/delta';

        while (cursor) {
            const request = buildGraphRequest(cursor, cursor === '/v1.0/groups/delta' ? { $select: selectFields } : undefined);

            // https://learn.microsoft.com/graph/api/group-delta
            const response = await nango.get({
                ...request,
                retries: 3
            });

            const parsed = DeltaResponseSchema.parse(response.data);
            const groups = parsed.value;

            const upserts: z.infer<typeof OrgUnitSchema>[] = [];
            const deletions: { id: string }[] = [];

            for (const group of groups) {
                const isDeleted = group['@removed'] !== undefined;

                if (isDeleted) {
                    deletions.push({ id: group.id });
                } else {
                    const orgUnit: z.infer<typeof OrgUnitSchema> = {
                        id: group.id,
                        ...(group.displayName != null && { displayName: group.displayName }),
                        ...(group.description != null && { description: group.description }),
                        ...(group.mail != null && { mail: group.mail }),
                        ...(group.mailNickname != null && { mailNickname: group.mailNickname }),
                        ...(group.groupTypes != null && { groupTypes: group.groupTypes }),
                        ...(group.securityEnabled != null && { securityEnabled: group.securityEnabled }),
                        ...(group.mailEnabled != null && { mailEnabled: group.mailEnabled }),
                        ...(group.visibility != null && { visibility: group.visibility }),
                        ...(group.createdDateTime != null && { createdDateTime: group.createdDateTime }),
                        ...(group.renewedDateTime != null && { renewedDateTime: group.renewedDateTime }),
                        ...(group.expirationDateTime != null && { expirationDateTime: group.expirationDateTime }),
                        ...(group.classification != null && { classification: group.classification })
                    };
                    upserts.push(orgUnit);
                }
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'OrgUnit');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'OrgUnit');
            }

            if (parsed['@odata.nextLink']) {
                cursor = parsed['@odata.nextLink'];
                await nango.saveCheckpoint({ deltaLink: cursor });
            } else if (parsed['@odata.deltaLink']) {
                cursor = parsed['@odata.deltaLink'];
                await nango.saveCheckpoint({ deltaLink: cursor });
                break;
            } else {
                break;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
