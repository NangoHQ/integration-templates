import { createSync } from 'nango';
import { z } from 'zod';

const SigningGroupSchema = z.object({
    id: z.string(),
    signingGroupId: z.string(),
    signingGroupName: z.string().optional(),
    created: z.string().optional(),
    createdBy: z.string().optional(),
    modified: z.string().optional(),
    modifiedBy: z.string().optional(),
    signingGroupType: z.string().optional()
});

const RawSigningGroupSchema = z
    .object({
        signingGroupId: z.string(),
        signingGroupName: z.string().optional().nullable(),
        created: z.string().optional().nullable(),
        createdBy: z.string().optional().nullable(),
        modified: z.string().optional().nullable(),
        modifiedBy: z.string().optional().nullable(),
        signingGroupType: z.string().optional().nullable()
    })
    .passthrough();

const MetadataSchema = z
    .object({
        accountId: z.string().optional()
    })
    .optional();

const CheckpointSchema = z.object({
    start_position: z.number().int().nonnegative()
});

function getAllowSigningGroups(data: unknown): string | undefined {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return undefined;
    }
    for (const key of Object.keys(data)) {
        const value = Reflect.get(data, key);
        if (key === 'allowSigningGroups' && typeof value === 'string') {
            return value;
        }
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const nested = getAllowSigningGroups(value);
            if (nested !== undefined) {
                return nested;
            }
        }
    }
    return undefined;
}

const sync = createSync({
    description: 'Sync signing groups (shared signature pools) with full-refresh delete tracking.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        SigningGroup: SigningGroupSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/signing-groups' }],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success || !parsedMetadata.data?.accountId) {
            throw new Error('accountId is required in connection metadata');
        }
        const accountId = parsedMetadata.data.accountId;

        const rawCheckpoint = await nango.getCheckpoint();
        let startPosition = 0;
        if (rawCheckpoint != null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            startPosition = parsedCheckpoint.data.start_position ?? 0;
        }

        // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/accountsettings/get/
        const settingsResponse = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/settings`,
            retries: 3
        });

        const allowSigningGroupsValue = getAllowSigningGroups(settingsResponse.data);
        const allowSigningGroups = allowSigningGroupsValue === 'true';
        if (!allowSigningGroups) {
            throw new Error('allowSigningGroups is not enabled for this account');
        }

        // Blocker: DocuSign GET /signing_groups has no changed-since filter,
        // no deleted-record endpoint, but it does support offset pagination.
        // We use a resumable full refresh with delete tracking.
        await nango.trackDeletesStart('SigningGroup');

        // https://developers.docusign.com/docs/esign-rest-api/reference/signinggroups/signinggroups/list/
        for await (const page of nango.paginate({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/signing_groups`,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'start_position',
                offset_start_value: startPosition,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'signingGroups'
            },
            retries: 3
        })) {
            const groups: Array<z.infer<typeof SigningGroupSchema>> = [];

            for (const item of page) {
                const parsedItem = RawSigningGroupSchema.safeParse(item);
                if (!parsedItem.success) {
                    throw new Error(`Failed to parse signing group: ${parsedItem.error.message}`);
                }
                const group = parsedItem.data;
                groups.push({
                    id: group.signingGroupId,
                    signingGroupId: group.signingGroupId,
                    ...(group.signingGroupName != null && { signingGroupName: group.signingGroupName }),
                    ...(group.created != null && { created: group.created }),
                    ...(group.createdBy != null && { createdBy: group.createdBy }),
                    ...(group.modified != null && { modified: group.modified }),
                    ...(group.modifiedBy != null && { modifiedBy: group.modifiedBy }),
                    ...(group.signingGroupType != null && { signingGroupType: group.signingGroupType })
                });
            }

            if (groups.length > 0) {
                await nango.batchSave(groups, 'SigningGroup');
            }

            startPosition += page.length;
            await nango.saveCheckpoint({ start_position: startPosition });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('SigningGroup');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
