import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        webLinkId: z.string().min(1).describe('Bookmark ID to move.'),
        parentFolderId: z.string().min(1).describe('Destination folder ID; must be 0 with destinationUserId.'),
        destinationUserId: z.string().min(1).optional().describe("Optional user ID for movement to that user's root.")
    })
    .superRefine((value, ctx) => {
        // JSON Schema if/then equivalent: destinationUserId is only valid for a root destination.
        if (value.destinationUserId !== undefined && value.parentFolderId !== '0') {
            ctx.addIssue({
                code: 'custom',
                message: 'parentFolderId must be "0" when destinationUserId is provided.',
                path: ['parentFolderId']
            });
        }
    })
    .describe(
        'Relocation of one Box bookmark: the bookmark to move, the destination folder, and optionally the destination user whose root folder receives it.'
    )
    .meta({
        if: { required: ['destinationUserId'] },
        then: { properties: { parentFolderId: { const: '0' } } }
    });

const OutputSchema = z
    .object({
        id: z.string().describe('Bookmark ID after relocation.'),
        ownerId: z.string().optional().describe('Resulting owner ID, when returned; not inferred from requested user.'),
        updatedAt: z.iso.datetime({ offset: true }).optional().describe('Modification instant in UTC, when returned.'),
        parentFolderId: z.string().optional().describe('Resulting parent ID, when returned.')
    })
    .describe('Result of relocating a Box bookmark; only values returned by Box are reported.');

const BoxWebLinkNameSchema = z.looseObject({
    name: z.string().optional()
});

const BoxWebLinkSchema = z.looseObject({
    id: z.string(),
    owned_by: z.looseObject({ id: z.string().optional() }).optional().nullable(),
    parent: z.looseObject({ id: z.string().optional() }).optional().nullable(),
    modified_at: z.string().optional().nullable()
});

const ProxyHttpErrorSchema = z.looseObject({
    response: z.looseObject({
        status: z.number().int(),
        data: z.unknown()
    })
});

const BoxClientErrorSchema = z.looseObject({
    code: z.string().optional(),
    message: z.string().optional()
});

function getHttpErrorInfo(error: unknown): { status: number; detail: string | undefined } | undefined {
    const parsed = ProxyHttpErrorSchema.safeParse(error);
    if (!parsed.success) {
        return undefined;
    }
    let detail: string | undefined;
    const body = BoxClientErrorSchema.safeParse(parsed.data.response.data);
    if (body.success) {
        const parts = [body.data.code, body.data.message].filter((part) => typeof part === 'string' && part.length > 0);
        if (parts.length > 0) {
            detail = parts.join(' - ');
        }
    }
    return { status: parsed.data.response.status, detail };
}

function throwProviderError(error: unknown): never {
    const info = getHttpErrorInfo(error);
    if (info === undefined) {
        throw error;
    }
    const suffix = info.detail !== undefined ? ` Box: ${info.detail}` : '';
    if (info.status === 404) {
        throw new Error(`not_found: The bookmark, destination folder, or destination user is unavailable. Check identifiers and visibility.${suffix}`);
    }
    if (info.status === 403) {
        throw new Error(
            `permission_denied: Authority over the bookmark, destination, or destination user is insufficient. Ask the owner/administrator or choose an accessible destination.${suffix}`
        );
    }
    if (info.status === 409) {
        throw new Error(
            `conflict: The destination folder or a move policy conflicts with this relocation. Choose another folder or rename with \`update-web-link\`.${suffix}`
        );
    }
    throw new Error(
        `provider_error: Box rejected the request with status ${info.status}. Review details and inspect the current parent before retrying.${suffix}`
    );
}

function toUtcDateTime(value: string): string | undefined {
    const match = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!match) {
        return undefined;
    }
    const epochMs = Date.parse(value);
    if (Number.isNaN(epochMs)) {
        return undefined;
    }
    // Offsets are whole minutes, so the fractional second part is unchanged by UTC conversion; re-append it to retain precision.
    const fraction = match[1] ?? '';
    const utcSecond = new Date(epochMs).toISOString().slice(0, 19);
    return `${utcSecond}${fraction}Z`;
}

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the bookmark to retain its name, then relocates it; moving to another folder or another user's root changes access and can be difficult to reverse.
 * @pitfalls: Box only allows a cross-user move into that user's root folder 0 and may require additional authority; destination policies can change who can access the bookmark after the move, and a same-named item already in the destination folder makes Box reject the move with a conflict.
 */
const tool = createTool({
    name: 'move-web-link',
    description: "Relocate an existing bookmark to a folder, including the documented option to target another user's root.",
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Obtain the bookmark ID with `list-web-links` or `get-web-link` and destination folder ID from Box. This relocates the same bookmark, not a copy. A destination user requires folder 0 and may require additional authority or affect access. Use `update-web-link` for content changes.',
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'true', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        if (input.destinationUserId !== undefined && input.parentFolderId !== '0') {
            throw new Error('invalid_input: destinationUserId requires parentFolderId to be "0" (the destination user\'s root folder).');
        }

        const webLinkPath = `/2.0/web_links/${encodeURIComponent(input.webLinkId)}`;

        // Box resets an omitted name to the bookmark URL on update, so read the current name first to retain it.
        let currentData: unknown;
        // @allowTryCatch: map Box HTTP error statuses to the tool's documented public error codes.
        try {
            // https://developer.box.com/reference/get-web-links-id/
            const currentResponse = await nango.get({
                endpoint: webLinkPath,
                retries: 3
            });
            currentData = currentResponse.data;
        } catch (error) {
            throwProviderError(error);
        }

        const parsedCurrent = BoxWebLinkNameSchema.safeParse(currentData);
        if (!parsedCurrent.success) {
            throw new Error('provider_error: The web link read returned an unexpected payload. Review details and inspect the current parent before retrying.');
        }
        const currentName = parsedCurrent.data.name;

        const updateBody: { parent: { id: string; user_id?: string }; name?: string } = {
            parent: {
                id: input.parentFolderId
            },
            ...(currentName !== undefined && { name: currentName })
        };

        let movedData: unknown;
        // @allowTryCatch: map Box HTTP error statuses to the tool's documented public error codes.
        try {
            // https://developer.box.com/reference/put-web-links-id/
            const moveResponse = await nango.put({
                endpoint: webLinkPath,
                data: updateBody,
                // retries 0: a move is not idempotent, so repeating it after a lost response could duplicate relocation, ownership, and access effects.
                retries: 0
            });
            movedData = moveResponse.data;
        } catch (error) {
            throwProviderError(error);
        }

        const parsedMove = BoxWebLinkSchema.safeParse(movedData);
        if (!parsedMove.success) {
            throw new Error(
                'write_result_unknown: The move response could not be interpreted. Use `get-web-link` to check the bookmark parent and owner before retrying.'
            );
        }
        const moved = parsedMove.data;

        let updatedAt: string | undefined;
        if (moved.modified_at !== undefined && moved.modified_at !== null) {
            const normalized = toUtcDateTime(moved.modified_at);
            if (normalized === undefined) {
                throw new Error(
                    'write_result_unknown: The move response returned a malformed modified_at. Use `get-web-link` to check the bookmark parent and owner before retrying.'
                );
            }
            updatedAt = normalized;
        }

        const ownerId = moved.owned_by?.id;
        const parentFolderId = moved.parent?.id;

        return {
            id: moved.id,
            ...(ownerId !== undefined && { ownerId }),
            ...(updatedAt !== undefined && { updatedAt }),
            ...(parentFolderId !== undefined && { parentFolderId })
        };
    }
});

export default tool;
