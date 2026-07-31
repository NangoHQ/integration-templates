import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('The ID of the drive containing the document. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('The ID of the Word document (driveItem). Example: "01RFYLAYGCHWM67HNJIZBJNCQTFNXT6YGT"'),
    cursor: z.string().url().optional().describe('Pagination cursor from the previous response (the value of nextLink). Omit for the first page.')
});

const ProviderIdentitySchema = z.object({
    id: z.string().nullable().optional(),
    displayName: z.string().nullable().optional()
});

const ProviderVersionSchema = z.object({
    id: z.string(),
    lastModifiedBy: z
        .object({
            user: ProviderIdentitySchema.nullable().optional(),
            application: ProviderIdentitySchema.nullable().optional(),
            device: ProviderIdentitySchema.nullable().optional()
        })
        .nullable()
        .optional(),
    lastModifiedDateTime: z.string().nullable().optional(),
    size: z.number().nullable().optional(),
    ['@microsoft.graph.downloadUrl']: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(z.unknown()),
    ['@odata.nextLink']: z.string().nullable().optional()
});

const VersionSchema = z.object({
    id: z.string(),
    lastModifiedBy: z
        .object({
            user: z
                .object({
                    id: z.string().optional(),
                    displayName: z.string().optional()
                })
                .optional(),
            application: z
                .object({
                    id: z.string().optional(),
                    displayName: z.string().optional()
                })
                .optional(),
            device: z
                .object({
                    id: z.string().optional(),
                    displayName: z.string().optional()
                })
                .optional()
        })
        .optional(),
    lastModifiedDateTime: z.string().optional(),
    size: z.number().optional(),
    downloadUrl: z.string().optional()
});

const OutputSchema = z.object({
    versions: z.array(VersionSchema),
    nextLink: z.string().optional()
});

type ProviderIdentity = z.infer<typeof ProviderIdentitySchema>;

const mapIdentity = (identity: ProviderIdentity | null | undefined): { id?: string; displayName?: string } | undefined => {
    if (!identity) {
        return undefined;
    }
    const mapped: { id?: string; displayName?: string } = {};
    if (identity.id != null) {
        mapped.id = identity.id;
    }
    if (identity.displayName != null) {
        mapped.displayName = identity.displayName;
    }
    return Object.keys(mapped).length > 0 ? mapped : undefined;
};

type VersionOutput = z.infer<typeof VersionSchema>;

const mapVersion = (raw: unknown): VersionOutput => {
    const v = ProviderVersionSchema.parse(raw);
    const mappedLastModifiedBy =
        v.lastModifiedBy != null
            ? {
                  ...(mapIdentity(v.lastModifiedBy.user) != null ? { user: mapIdentity(v.lastModifiedBy.user) } : {}),
                  ...(mapIdentity(v.lastModifiedBy.application) != null ? { application: mapIdentity(v.lastModifiedBy.application) } : {}),
                  ...(mapIdentity(v.lastModifiedBy.device) != null ? { device: mapIdentity(v.lastModifiedBy.device) } : {})
              }
            : undefined;
    return {
        id: v.id,
        ...(mappedLastModifiedBy != null && Object.keys(mappedLastModifiedBy).length > 0 ? { lastModifiedBy: mappedLastModifiedBy } : {}),
        ...(v.lastModifiedDateTime != null ? { lastModifiedDateTime: v.lastModifiedDateTime } : {}),
        ...(v.size != null ? { size: v.size } : {}),
        ...(v['@microsoft.graph.downloadUrl'] != null ? { downloadUrl: v['@microsoft.graph.downloadUrl'] } : {})
    };
};

const action = createAction({
    description: 'List the version history of a Word document.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read.All', 'Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const endpoint = `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/versions`;
        const params: Record<string, string> = {};

        if (input.cursor) {
            const url = new URL(input.cursor);
            if (url.pathname !== endpoint) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'cursor must be a nextLink returned by this same action for this driveId/itemId'
                });
            }
            for (const [key, value] of url.searchParams.entries()) {
                params[key] = value;
            }
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/driveitem-list-versions
            endpoint,
            retries: 3
        };

        if (Object.keys(params).length > 0) {
            config.params = params;
        }

        const response = await nango.get(config);

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            versions: parsed.value.map(mapVersion),
            ...(parsed['@odata.nextLink'] != null ? { nextLink: parsed['@odata.nextLink'] } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
