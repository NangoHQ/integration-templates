import { z } from 'zod';
import { createTool } from 'nango';
import type { HttpResponse, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        limit: z.number().int().min(1).max(100).optional().describe('Maximum versions requested in one page; defaults to 100.'),
        cursor: z.string().min(1).optional().describe('Opaque continuation for the same assignment; omit initially.'),
        legalHoldPolicyAssignmentId: z.string().min(1).describe('Opaque assignment identifier whose previous held versions to inspect.')
    })
    .describe('Input for listing one page of previous file versions held under a legal hold policy assignment.');

const UserSchema = z
    .object({
        id: z.string().optional().describe('Opaque user identifier.'),
        name: z.string().optional().describe('User display name, if returned.'),
        login: z.string().optional().describe('User login email, if returned.')
    })
    .describe('User reference attached to a held file version.');

const FileVersionItemSchema = z
    .object({
        id: z.string().describe('Opaque file version identifier.'),
        name: z.string().optional().describe('Version name, if returned.'),
        sha1: z.string().optional().describe('SHA-1 digest, if returned.'),
        purgedAt: z.iso
            .datetime({ offset: true })
            .nullable()
            .optional()
            .describe("Provider's UTC scheduled permanent-deletion instant; null and omission are preserved."),
        createdAt: z.iso.datetime({ offset: true }).optional().describe('UTC version-object creation instant, if returned.'),
        sizeBytes: z.number().int().min(0).optional().describe('Version size in bytes, if returned.'),
        trashedAt: z.iso.datetime({ offset: true }).nullable().optional().describe('UTC trash instant; null means not trashed, omission means unavailable.'),
        trashedBy: UserSchema.optional().describe('User who trashed the version, if returned.'),
        updatedAt: z.iso.datetime({ offset: true }).optional().describe('UTC version-object last modification instant, if returned.'),
        modifiedBy: UserSchema.optional().describe('Last modifying user, if returned.'),
        restoredAt: z.iso.datetime({ offset: true }).nullable().optional().describe('UTC restoration instant; null and omission are preserved.'),
        restoredBy: UserSchema.optional().describe('User who restored the version, if returned.'),
        uploaderDisplayName: z.string().optional().describe('Provider uploader label, which may be a name, email, or anonymous label; omitted if unavailable.')
    })
    .describe('A previous file version held under the assignment.');

const OutputSchema = z
    .object({
        items: z.array(FileVersionItemSchema).describe('Previous held versions in provider order; not a complete inventory across hold architectures.'),
        nextCursor: z.string().optional().describe('Opaque continuation token; omitted when exhausted.')
    })
    .describe('One page of previous held file versions for a legal hold policy assignment.');

const ProviderUserSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    login: z.string().optional()
});

const ProviderFileVersionSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    sha1: z.string().optional(),
    size: z.number().int().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    trashed_at: z.string().nullable().optional(),
    purged_at: z.string().nullable().optional(),
    restored_at: z.string().nullable().optional(),
    modified_by: ProviderUserSchema.nullable().optional(),
    trashed_by: ProviderUserSchema.nullable().optional(),
    restored_by: ProviderUserSchema.nullable().optional(),
    uploader_display_name: z.string().optional()
});

const ProviderResponseSchema = z.object({
    entries: z.array(ProviderFileVersionSchema).optional(),
    next_marker: z.string().nullable().optional()
});

const ProviderClientErrorSchema = z.object({
    code: z.string().optional(),
    message: z.string().optional(),
    request_id: z.string().optional()
});

const ProxyHttpErrorSchema = z.object({
    response: z
        .object({
            status: z.number().optional(),
            data: z.unknown().optional()
        })
        .optional()
});

const DATE_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Normalizes an offset-bearing RFC 3339 instant to UTC `Z`, retaining the
 * original fractional-second precision. Unparseable values pass through
 * unchanged so the output schema can surface malformed provider data.
 */
function toUtcIsoString(value: string): string {
    const match = DATE_TIME_PATTERN.exec(value);
    if (!match) {
        return value;
    }
    const wholeSeconds = match[1];
    const zone = match[3];
    if (wholeSeconds === undefined || zone === undefined) {
        return value;
    }
    const fraction = match[2] ?? '';
    const epochMs = Date.parse(`${wholeSeconds}${zone}`);
    if (Number.isNaN(epochMs)) {
        return value;
    }
    return `${new Date(epochMs).toISOString().slice(0, 19)}${fraction}Z`;
}

/**
 * Encodes a provider marker together with its assignment so a cursor cannot be
 * replayed against a different assignment.
 */
function encodeCursor(assignmentId: string, marker: string): string {
    return Buffer.from(`${assignmentId.length}:${assignmentId}${marker}`, 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): { assignmentId: string; marker: string } | null {
    const payload = Buffer.from(cursor, 'base64url').toString('utf8');
    const match = /^(\d+):/.exec(payload);
    if (!match) {
        return null;
    }
    const prefix = match[0];
    const lengthText = match[1];
    if (prefix === undefined || lengthText === undefined) {
        return null;
    }
    const length = Number(lengthText);
    if (!Number.isSafeInteger(length) || length < 1) {
        return null;
    }
    const idEnd = prefix.length + length;
    if (payload.length <= idEnd) {
        return null;
    }
    const assignmentId = payload.slice(prefix.length, idEnd);
    const marker = payload.slice(idEnd);
    if (encodeCursor(assignmentId, marker) !== cursor) {
        return null;
    }
    return { assignmentId, marker };
}

function mapUser(user: z.infer<typeof ProviderUserSchema> | null | undefined): z.infer<typeof UserSchema> | undefined {
    if (user === null || user === undefined) {
        return undefined;
    }
    return {
        ...(user.id !== undefined && { id: user.id }),
        ...(user.name !== undefined && { name: user.name }),
        ...(user.login !== undefined && { login: user.login })
    };
}

function mapFileVersion(entry: z.infer<typeof ProviderFileVersionSchema>): z.infer<typeof FileVersionItemSchema> {
    const trashedBy = mapUser(entry.trashed_by);
    const modifiedBy = mapUser(entry.modified_by);
    const restoredBy = mapUser(entry.restored_by);
    return {
        id: entry.id,
        ...(entry.name !== undefined && { name: entry.name }),
        ...(entry.sha1 !== undefined && { sha1: entry.sha1 }),
        ...(entry.purged_at !== undefined && { purgedAt: entry.purged_at === null ? null : toUtcIsoString(entry.purged_at) }),
        ...(entry.created_at !== undefined && { createdAt: toUtcIsoString(entry.created_at) }),
        ...(entry.size !== undefined && { sizeBytes: entry.size }),
        ...(entry.trashed_at !== undefined && { trashedAt: entry.trashed_at === null ? null : toUtcIsoString(entry.trashed_at) }),
        ...(trashedBy !== undefined && { trashedBy }),
        ...(entry.modified_at !== undefined && { updatedAt: toUtcIsoString(entry.modified_at) }),
        ...(modifiedBy !== undefined && { modifiedBy }),
        ...(entry.restored_at !== undefined && { restoredAt: entry.restored_at === null ? null : toUtcIsoString(entry.restored_at) }),
        ...(restoredBy !== undefined && { restoredBy }),
        ...(entry.uploader_display_name !== undefined && { uploaderDisplayName: entry.uploader_display_name })
    };
}

function extractFallbackMessage(error: unknown): string {
    const parsed = z.object({ message: z.string() }).safeParse(error);
    return parsed.success ? parsed.data.message : 'Unknown error';
}

function classifyProviderError(error: unknown, usedMarker: boolean): Error {
    const parsed = ProxyHttpErrorSchema.safeParse(error);
    const status = parsed.success ? parsed.data.response?.status : undefined;
    const providerError = ProviderClientErrorSchema.safeParse(parsed.success ? parsed.data.response?.data : undefined);
    const details: string[] = [];
    if (providerError.success) {
        if (providerError.data.code !== undefined) {
            details.push(`code=${providerError.data.code}`);
        }
        if (providerError.data.message !== undefined) {
            details.push(`message=${providerError.data.message}`);
        }
        if (providerError.data.request_id !== undefined) {
            details.push(`request_id=${providerError.data.request_id}`);
        }
    }
    const suffix = details.length > 0 ? details.join(', ') : extractFallbackMessage(error);
    if (status === 404) {
        return new Error(
            `not_found_or_inaccessible: The legal hold policy assignment is missing or inaccessible. Verify it with list-legal-hold-policy-assignments. ${suffix}`
        );
    }
    if (status === 401 || status === 403) {
        return new Error(
            `permission_denied: Legal-hold inspection is not permitted for this connection. Request legal-hold access from a Box administrator. ${suffix}`
        );
    }
    if (status === 400 && usedMarker) {
        return new Error(`invalid_cursor: The continuation cursor was rejected by Box. Restart without a cursor. ${suffix}`);
    }
    return new Error(`provider_error: Box returned an unexpected error (status ${status === undefined ? 'unknown' : status}). ${suffix}`);
}

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET of one page of previous file versions held under a Box legal hold policy assignment; nothing is created, modified, or deleted in Box.
 * @pitfalls: Results cover only past versions in Box's newer hold architecture and exclude legacy-architecture holds and holds caused by a custodian collaborating on a Hub, so an empty or short page does not prove the assignment holds no other content. Box does not offer this operation on its Free Developer Plan.
 */
const tool = createTool({
    name: 'list-legal-hold-previous-file-versions',
    description:
        "List one page of previous file versions held under an assignment in Box's newer hold architecture. This is not a complete enterprise legal-hold inventory and excludes holds caused by a custodian collaborating on a Hub.",
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Get an assignment ID from `list-legal-hold-policy-assignments`. Use this for previous versions; use `list-legal-hold-current-files` for latest versions. Results exclude legacy-architecture holds and Hub-collaboration holds. Pass nextCursor as cursor with the same assignment to continue.',
        requiredScopes: [],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        let marker: string | undefined;
        if (input.cursor !== undefined) {
            const decoded = decodeCursor(input.cursor);
            if (decoded === null) {
                throw new Error('invalid_cursor: The continuation cursor is malformed. Restart without a cursor.');
            }
            if (decoded.assignmentId !== input.legalHoldPolicyAssignmentId) {
                throw new Error('invalid_cursor: The continuation cursor was issued for a different assignment. Restart without a cursor.');
            }
            marker = decoded.marker;
        }

        const config: ProxyConfiguration = {
            // https://developer.box.com/reference/get-legal-hold-policy-assignments-id-file-versions-on-hold/
            endpoint: `/2.0/legal_hold_policy_assignments/${encodeURIComponent(input.legalHoldPolicyAssignmentId)}/file_versions_on_hold`,
            params: {
                // Box only paginates by marker when marker mode is enabled.
                usemarker: 'true',
                limit: input.limit ?? 100,
                ...(marker !== undefined && { marker })
            },
            retries: 3
        };

        let response: HttpResponse<unknown>;
        // @allowTryCatch: Provider HTTP failures are reclassified into the public error codes of the tool contract.
        try {
            response = await nango.get(config);
        } catch (error) {
            throw classifyProviderError(error, marker !== undefined);
        }

        const parsed = ProviderResponseSchema.parse(response.data);
        const items = (parsed.entries ?? []).map(mapFileVersion);

        const nextMarker = parsed.next_marker;
        return {
            items,
            ...(nextMarker !== undefined &&
                nextMarker !== null &&
                nextMarker !== '' && { nextCursor: encodeCursor(input.legalHoldPolicyAssignmentId, nextMarker) })
        };
    }
});

export default tool;
