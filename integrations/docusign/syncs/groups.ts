import { createSync } from 'nango';
import { z } from 'zod';

const ProviderGroupSchema = z.object({
    groupId: z.string(),
    groupName: z.string().optional(),
    groupType: z.string().optional(),
    accessType: z.string().optional(),
    dsGroupId: z.string().optional(),
    isManagedByScim: z.boolean().optional(),
    lastModifiedOn: z.string().optional(),
    permissionProfileId: z.string().optional(),
    userGroupType: z.string().optional(),
    usersCount: z.string().optional()
});

const MetadataSchema = z.object({
    accountId: z.string()
});

const CheckpointSchema = z.object({
    start_position: z.number().int().nonnegative()
});

const GroupSchema = z.object({
    id: z.string(),
    groupId: z.string(),
    groupName: z.string().optional(),
    groupType: z.string().optional(),
    accessType: z.string().optional(),
    dsGroupId: z.string().optional(),
    isManagedByScim: z.boolean().optional(),
    lastModifiedOn: z.string().optional(),
    permissionProfileId: z.string().optional(),
    userGroupType: z.string().optional(),
    usersCount: z.string().optional()
});

const sync = createSync({
    description: 'Sync account groups with full-refresh delete tracking.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Group: GroupSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error('accountId is required in metadata');
        }
        const accountId = parsedMetadata.data.accountId;

        const rawCheckpoint = await nango.getCheckpoint();
        let startPosition = 0;
        if (rawCheckpoint !== null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            startPosition = parsedCheckpoint.data.start_position;
        }

        // Blocker: DocuSign GET /groups has no changed-since filter,
        // no deleted-record endpoint, but it does support offset pagination.
        // We use a resumable full refresh with delete tracking.
        if (startPosition === 0) {
            await nango.trackDeletesStart('Group');
        }

        // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/accountgroups/list/
        for await (const page of nango.paginate({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/groups`,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'start_position',
                offset_start_value: startPosition,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'groups'
            },
            retries: 3
        })) {
            const groups = page.map((item: unknown) => {
                const parsed = ProviderGroupSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse group: ${parsed.error.message}`);
                }
                const group = parsed.data;
                return {
                    id: group.groupId,
                    groupId: group.groupId,
                    groupName: group.groupName,
                    groupType: group.groupType,
                    accessType: group.accessType,
                    dsGroupId: group.dsGroupId,
                    isManagedByScim: group.isManagedByScim,
                    lastModifiedOn: group.lastModifiedOn,
                    permissionProfileId: group.permissionProfileId,
                    userGroupType: group.userGroupType,
                    usersCount: group.usersCount
                };
            });

            if (groups.length > 0) {
                await nango.batchSave(groups, 'Group');
            }

            startPosition += page.length;
            await nango.saveCheckpoint({ start_position: startPosition });
        }

        await nango.trackDeletesEnd('Group');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
