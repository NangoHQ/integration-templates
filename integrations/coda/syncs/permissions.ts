import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PrincipalSchema = z
    .object({
        type: z.string(),
        email: z.string().optional(),
        groupId: z.string().optional(),
        groupName: z.string().optional(),
        domain: z.string().optional(),
        workspaceId: z.string().optional(),
        userId: z.string().optional(),
        loginId: z.string().optional(),
        name: z.string().optional(),
        pictureLink: z.string().optional()
    })
    .passthrough();

const ProviderPermissionSchema = z.object({
    id: z.string(),
    access: z.string(),
    principal: PrincipalSchema
});

const PermissionSchema = z.object({
    id: z.string(),
    permissionId: z.string(),
    access: z.string(),
    principalType: z.string(),
    principalEmail: z.string().optional(),
    principalGroupId: z.string().optional(),
    principalGroupName: z.string().optional(),
    principalDomain: z.string().optional(),
    principalWorkspaceId: z.string().optional(),
    principalUserId: z.string().optional(),
    principalLoginId: z.string().optional(),
    principalName: z.string().optional(),
    principalPictureLink: z.string().optional()
});

const CheckpointSchema = z.object({
    pageToken: z.string()
});

const MetadataSchema = z.object({
    docId: z.string()
});

function buildPrincipalId(principal: z.infer<typeof PrincipalSchema>): string {
    const type = principal.type;
    switch (type) {
        case 'email':
            return `email:${principal.email}`;
        case 'user':
            return `user:${principal.userId ?? principal.loginId ?? principal.email}`;
        case 'group':
            return `group:${principal.groupId}`;
        case 'domain':
            return `domain:${principal.domain}`;
        case 'workspace':
            return `workspace:${principal.workspaceId}`;
        case 'anyone':
            return 'anyone';
        default:
            return `unknown:${type}`;
    }
}

const sync = createSync({
    description: 'Sync sharing permissions for a configured doc',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Permission: PermissionSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/permissions' }],

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.safeParse(rawMetadata);
        if (!metadata.success) {
            throw new Error('docId is required in metadata');
        }
        const docId = metadata.data.docId;

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.safeParse(rawCheckpoint ?? { pageToken: '' });
        if (!checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }
        let pageToken: string | undefined = checkpoint.data.pageToken || undefined;

        if (!pageToken) {
            await nango.trackDeletesStart('Permission');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://coda.io/developers/apis/v1#tag/Permissions/operation/getPermissions
            endpoint: `/docs/${encodeURIComponent(docId)}/acl/permissions`,
            params: {
                ...(pageToken ? { pageToken } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'pageToken',
                cursor_path_in_response: 'nextPageToken',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    pageToken = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items = z.array(ProviderPermissionSchema).safeParse(page);
            if (!items.success) {
                throw new Error(`Failed to parse permissions page: ${items.error.message}`);
            }

            const records = items.data.map((permission) => {
                const principal = permission.principal;
                const record: z.infer<typeof PermissionSchema> = {
                    id: buildPrincipalId(principal),
                    permissionId: permission.id,
                    access: permission.access,
                    principalType: principal.type,
                    ...(principal.email !== undefined && {
                        principalEmail: principal.email
                    }),
                    ...(principal.groupId !== undefined && {
                        principalGroupId: principal.groupId
                    }),
                    ...(principal.groupName !== undefined && {
                        principalGroupName: principal.groupName
                    }),
                    ...(principal.domain !== undefined && {
                        principalDomain: principal.domain
                    }),
                    ...(principal.workspaceId !== undefined && {
                        principalWorkspaceId: principal.workspaceId
                    }),
                    ...(principal.userId !== undefined && {
                        principalUserId: principal.userId
                    }),
                    ...(principal.loginId !== undefined && {
                        principalLoginId: principal.loginId
                    }),
                    ...(principal.name !== undefined && {
                        principalName: principal.name
                    }),
                    ...(principal.pictureLink !== undefined && {
                        principalPictureLink: principal.pictureLink
                    })
                };
                return record;
            });

            if (records.length > 0) {
                await nango.batchSave(records, 'Permission');
            }

            await nango.saveCheckpoint({ pageToken: pageToken ?? '' });
        }

        await nango.trackDeletesEnd('Permission');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
