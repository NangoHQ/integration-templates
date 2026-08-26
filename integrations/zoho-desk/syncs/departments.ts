import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderDepartmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    createdTime: z.string().optional(),
    chatStatus: z.string().optional(),
    isEnabled: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    hasLogo: z.boolean().optional(),
    creatorId: z.string().optional(),
    isAssignToTeamEnabled: z.boolean().optional(),
    isVisibleInCustomerPortal: z.boolean().optional(),
    nameInCustomerPortal: z.string().optional(),
    sanitizedName: z.string().optional()
});

const DepartmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    createdTime: z.string().optional(),
    chatStatus: z.string().optional(),
    isEnabled: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    hasLogo: z.boolean().optional(),
    creatorId: z.string().optional(),
    isAssignToTeamEnabled: z.boolean().optional(),
    isVisibleInCustomerPortal: z.boolean().optional(),
    nameInCustomerPortal: z.string().optional(),
    sanitizedName: z.string().optional()
});

const ConnectionMetadataSchema = z.object({
    orgId: z.string()
});

const ConnectionConfigSchema = z.object({
    extension: z.string()
});

const CheckpointSchema = z.object({
    from: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync departments.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: false,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/departments'
        }
    ],
    models: {
        Department: DepartmentSchema
    },

    exec: async (nango) => {
        // Blocker: The Zoho Desk GET /api/v1/departments endpoint does not expose
        // an updated/modified timestamp filter or a changed-records cursor.
        // Full refresh with trackDeletesStart/trackDeletesEnd is appropriate.
        // Pagination uses from/limit; checkpoint the next from offset so a timed-out
        // run resumes without restarting from page 1.

        const metadata = await nango.getMetadata();
        const metadataParse = ConnectionMetadataSchema.safeParse(metadata);
        if (!metadataParse.success) {
            throw new Error('Missing orgId in connection metadata');
        }

        const orgId = metadataParse.data.orgId;

        const connection = await nango.getConnection();
        const configParse = ConnectionConfigSchema.safeParse(connection.connection_config);
        const baseUrlOverride = configParse.success ? `https://desk.zoho.${configParse.data.extension}` : undefined;

        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const startFrom = parsedCheckpoint.success ? parsedCheckpoint.data.from : undefined;
        let nextFrom: number | undefined;

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('Department');

        const proxyConfig: ProxyConfiguration = {
            // https://desk.zoho.com/DeskAPIDocument
            endpoint: '/api/v1/departments',
            ...(baseUrlOverride !== undefined && { baseUrlOverride }),
            headers: {
                orgId: orgId
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'from',
                offset_start_value: startFrom ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 50,
                response_path: 'data',
                on_page: async ({ nextPageParam }) => {
                    nextFrom = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const departments: {
                id: string;
                name: string;
                description?: string;
                createdTime?: string;
                chatStatus?: string;
                isEnabled?: boolean;
                isDefault?: boolean;
                hasLogo?: boolean;
                creatorId?: string;
                isAssignToTeamEnabled?: boolean;
                isVisibleInCustomerPortal?: boolean;
                nameInCustomerPortal?: string;
                sanitizedName?: string;
            }[] = [];

            for (const record of page) {
                const parseResult = ProviderDepartmentSchema.safeParse(record);
                if (!parseResult.success) {
                    throw new Error(`Failed to parse department: ${JSON.stringify(parseResult.error.issues)}`);
                }

                const dept = parseResult.data;

                departments.push({
                    id: dept.id,
                    name: dept.name,
                    ...(dept.description != null && { description: dept.description }),
                    ...(dept.createdTime !== undefined && { createdTime: dept.createdTime }),
                    ...(dept.chatStatus !== undefined && { chatStatus: dept.chatStatus }),
                    ...(dept.isEnabled !== undefined && { isEnabled: dept.isEnabled }),
                    ...(dept.isDefault !== undefined && { isDefault: dept.isDefault }),
                    ...(dept.hasLogo !== undefined && { hasLogo: dept.hasLogo }),
                    ...(dept.creatorId !== undefined && { creatorId: dept.creatorId }),
                    ...(dept.isAssignToTeamEnabled !== undefined && { isAssignToTeamEnabled: dept.isAssignToTeamEnabled }),
                    ...(dept.isVisibleInCustomerPortal !== undefined && { isVisibleInCustomerPortal: dept.isVisibleInCustomerPortal }),
                    ...(dept.nameInCustomerPortal !== undefined && { nameInCustomerPortal: dept.nameInCustomerPortal }),
                    ...(dept.sanitizedName !== undefined && { sanitizedName: dept.sanitizedName })
                });
            }

            if (departments.length > 0) {
                await nango.batchSave(departments, 'Department');
            }

            // Save pagination progress after every page. Without this, a run that
            // exceeds the execution window restarts from page 1 next time instead of
            // resuming where it left off.
            if (nextFrom !== undefined) {
                await nango.saveCheckpoint({ from: nextFrom });
            }
        }

        // Clear the checkpoint only after the last page has been saved, then close the
        // delete-tracking window opened by trackDeletesStart().
        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Department');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
