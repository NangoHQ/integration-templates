import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        limit: z.number().int().min(1).max(100).optional().describe('Maximum cards in this page; local supported range 1–100.'),
        cursor: z.string().min(1).optional().describe("Opaque continuation token from this board's previous app-card page."),
        boardId: z.string().min(1).describe('Board whose app cards to list.')
    })
    .describe('Board and page selector for listing app cards.');

const AppCardFieldSchema = z
    .object({
        value: z.string().optional().describe('Preview text.'),
        iconUrl: z.string().optional().describe('Icon image URL.'),
        tooltip: z.string().optional().describe('Tooltip text.'),
        fillColor: z.string().optional().describe('Preview background color.'),
        iconShape: z.string().optional().describe('Icon shape.'),
        textColor: z.string().optional().describe('Preview text color.')
    })
    .describe('One preview field shown on the app card.');

const AppCardSchema = z
    .object({
        id: z.string().describe('App card ID.'),
        owned: z.boolean().optional().describe('Whether the calling application owns the card.'),
        title: z.string().optional().describe('Card header text.'),
        fields: z.array(AppCardFieldSchema).optional().describe('Ordered preview fields.'),
        status: z.string().optional().describe('Source-connection state.'),
        boardId: z.string().describe('Containing board ID.'),
        geometry: z
            .object({
                width: z.number().optional().describe('Width in pixels.'),
                height: z.number().optional().describe('Height in pixels.'),
                rotation: z.number().optional().describe('Degrees, positive clockwise.')
            })
            .optional()
            .describe('Dimensions and rotation.'),
        position: z
            .object({
                x: z.number().optional().describe('Horizontal pixels.'),
                y: z.number().optional().describe('Vertical pixels.'),
                relativeTo: z.string().optional().describe('Coordinate reference: canvas_center or parent_top_left.')
            })
            .optional()
            .describe('Card center location.'),
        createdAt: z.iso.datetime({ offset: true }).optional().describe('Creation instant in UTC preserving source precision.'),
        updatedAt: z.iso.datetime({ offset: true }).optional().describe('Last modification instant in UTC preserving source precision.'),
        borderColor: z.string().optional().describe('Card border color, when available.'),
        createdById: z.string().optional().describe('Creator user ID.'),
        description: z.string().optional().describe('Card context text.'),
        updatedById: z.string().optional().describe('Last modifier user ID.'),
        parentFrameId: z.string().optional().describe('Parent frame ID, when returned.')
    })
    .describe('One app card on the requested board.');

const OutputSchema = z
    .object({
        items: z.array(AppCardSchema).describe('One provider page of app cards.'),
        nextCursor: z.string().optional().describe('Opaque token for another page; omitted when exhausted.')
    })
    .describe('One page of app cards from the requested board.');

const ProviderCustomFieldSchema = z.object({
    value: z.string().nullish(),
    iconUrl: z.string().nullish(),
    tooltip: z.string().nullish(),
    fillColor: z.string().nullish(),
    iconShape: z.string().nullish(),
    textColor: z.string().nullish()
});

const ProviderAppCardDataSchema = z.object({
    owned: z.boolean().nullish(),
    title: z.string().nullish(),
    description: z.string().nullish(),
    status: z.string().nullish(),
    fields: z.array(ProviderCustomFieldSchema).nullish()
});

const ProviderItemSchema = z.object({
    id: z.string(),
    data: ProviderAppCardDataSchema.nullish(),
    style: z.object({ fillColor: z.string().nullish() }).nullish(),
    parent: z.object({ id: z.string().nullish() }).nullish(),
    geometry: z.object({ width: z.number().nullish(), height: z.number().nullish(), rotation: z.number().nullish() }).nullish(),
    position: z.object({ x: z.number().nullish(), y: z.number().nullish(), relativeTo: z.string().nullish() }).nullish(),
    createdAt: z.string().nullish(),
    modifiedAt: z.string().nullish(),
    createdBy: z.object({ id: z.string().nullish() }).nullish(),
    modifiedBy: z.object({ id: z.string().nullish() }).nullish()
});

const ProviderPageSchema = z.object({
    data: z.array(ProviderItemSchema).nullish(),
    cursor: z.string().nullish(),
    links: z.object({ next: z.string().nullish() }).nullish()
});

const HttpErrorSchema = z.object({
    response: z.object({ status: z.number().optional() }).nullish(),
    status: z.number().nullish()
});

function getHttpStatus(error: unknown): number | undefined {
    const parsed = HttpErrorSchema.safeParse(error);
    if (!parsed.success) {
        return undefined;
    }
    return parsed.data.response?.status ?? parsed.data.status ?? undefined;
}

function toUtcDateTime(value: string): string {
    if (value.endsWith('Z')) {
        return value;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Miro returned a malformed date-time value: ${value}`);
    }
    return parsed.toISOString();
}

function getNextCursor(page: z.infer<typeof ProviderPageSchema>): string | undefined {
    if (page.cursor != null && page.cursor.length > 0) {
        return page.cursor;
    }
    const next = page.links?.next;
    if (next != null && next.length > 0 && URL.canParse(next)) {
        const cursor = new URL(next).searchParams.get('cursor');
        if (cursor != null && cursor.length > 0) {
            return cursor;
        }
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Reads one page of app cards from the board without modifying any board content.
 * @pitfalls: Miro rejects a limit outside its documented 10–50 page-size range with invalid_request even though this tool accepts 1–100. A board the connection cannot access surfaces as not_found (Miro's 404 means invalid access), distinct from a missing boards:read scope. Item order is not documented, so do not rely on a stable ordering across pages.
 */
const tool = createTool({
    name: 'list-app-cards',
    description: 'List one page of app cards on a specified board, including content, preview fields, and layout.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use this to discover app card IDs on a board. Use `get-app-card` for one known ID. Pass nextCursor back as cursor with the same board to continue. Limit defaults to 10 and is bounded to 100.',
        requiredScopes: ['boards:read'],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;
        const limit = input.limit ?? 10;

        let response;
        // @allowTryCatch: map documented provider HTTP failures to the tool's public error codes.
        try {
            // https://developers.miro.com/reference/get-items-1
            response = await nango.get({
                endpoint: `/v2/boards/${encodeURIComponent(input.boardId)}/items`,
                params: {
                    limit: String(limit),
                    type: 'app_card',
                    ...(input.cursor !== undefined && { cursor: input.cursor })
                },
                retries: 3
            });
        } catch (error) {
            const status = getHttpStatus(error);
            if (status === 400) {
                throw new Error('invalid_request: Miro rejected the cursor or list parameter. Restart without the cursor if its context has changed.');
            }
            if (status === 401 || status === 403) {
                throw new Error('permission_denied: The connection cannot read this board. Ask for board access and the boards:read permission.');
            }
            if (status === 404) {
                throw new Error('not_found: The board is unavailable. Verify the board ID.');
            }
            if (status === 429) {
                throw new Error('rate_limited: Miro rate-limited the list request. Wait and retry the same page.');
            }
            throw error;
        }

        const page = ProviderPageSchema.parse(response.data);

        const items = (page.data ?? []).map((item): z.infer<typeof AppCardSchema> => {
            const data = item.data ?? {};
            return {
                id: item.id,
                boardId: input.boardId,
                ...(data.owned != null && { owned: data.owned }),
                ...(data.title != null && { title: data.title }),
                ...(data.fields != null && {
                    fields: data.fields.map(
                        (field): z.infer<typeof AppCardFieldSchema> => ({
                            ...(field.value != null && { value: field.value }),
                            ...(field.iconUrl != null && { iconUrl: field.iconUrl }),
                            ...(field.tooltip != null && { tooltip: field.tooltip }),
                            ...(field.fillColor != null && { fillColor: field.fillColor }),
                            ...(field.iconShape != null && { iconShape: field.iconShape }),
                            ...(field.textColor != null && { textColor: field.textColor })
                        })
                    )
                }),
                ...(data.status != null && { status: data.status }),
                ...(item.geometry != null && {
                    geometry: {
                        ...(item.geometry.width != null && { width: item.geometry.width }),
                        ...(item.geometry.height != null && { height: item.geometry.height }),
                        ...(item.geometry.rotation != null && { rotation: item.geometry.rotation })
                    }
                }),
                ...(item.position != null && {
                    position: {
                        ...(item.position.x != null && { x: item.position.x }),
                        ...(item.position.y != null && { y: item.position.y }),
                        ...(item.position.relativeTo != null && { relativeTo: item.position.relativeTo })
                    }
                }),
                ...(item.createdAt != null && { createdAt: toUtcDateTime(item.createdAt) }),
                ...(item.modifiedAt != null && { updatedAt: toUtcDateTime(item.modifiedAt) }),
                ...(item.style?.fillColor != null && { borderColor: item.style.fillColor }),
                ...(item.createdBy?.id != null && { createdById: item.createdBy.id }),
                ...(data.description != null && { description: data.description }),
                ...(item.modifiedBy?.id != null && { updatedById: item.modifiedBy.id }),
                ...(item.parent?.id != null && { parentFrameId: item.parent.id })
            };
        });

        const nextCursor = getNextCursor(page);

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export default tool;
