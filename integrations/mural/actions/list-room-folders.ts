import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const FolderSchema = z.object({
    id: z.string().describe('Unique identifier (UUID) of the folder. Example: "29abcfdd-b9ba-4ced-aa27-00694889"'),
    name: z.string().describe('Display name of the folder. Example: "Folder 001"'),
    get children() {
        return z.array(FolderSchema).describe('Sub-folders contained directly inside this folder; empty when the folder has none.');
    }
});

const InputSchema = z
    .object({
        roomId: z.string().min(1).describe('Identifier of the room whose folders should be listed. Example: "1791984264781658"'),
        cursor: z
            .string()
            .min(1)
            .optional()
            .describe('Opaque pagination token taken from the `next` field of a previous response. Omit to fetch the first page.'),
        limit: z
            .number()
            .int()
            .positive()
            .max(100)
            .optional()
            .describe('Maximum number of folders to return in this page (1-100). Defaults to the provider default when omitted.')
    })
    .describe('Filters selecting which room folders to list.');

const OutputSchema = z
    .object({
        value: z.array(FolderSchema).describe("Folders at the root of the room; nested sub-folders appear inside each folder's `children` array."),
        next: z
            .string()
            .optional()
            .describe('Opaque token to pass back as `cursor` to fetch the next page. Returned even on the last page, so stop when `value` is empty.')
    })
    .describe('Folders contained in the room and an optional pagination token.');

/**
 * @tags: [read]
 * @tagReason: Reads the folder hierarchy of a room without modifying any provider data.
 * @pitfalls: `next` is present even on the final page, so stop paginating when `value` is empty rather than when `next` is absent; only folders the authenticated user can access are returned, so a room may have folders that this action omits.
 */
const action = createAction({
    description: 'List the folders that exist inside a room.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.cursor !== undefined) {
            params['next'] = input.cursor;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        const config: ProxyConfiguration = {
            // https://developers.mural.co/public/reference/getroomfolders
            endpoint: `/api/public/v1/rooms/${encodeURIComponent(input.roomId)}/folders`,
            params,
            retries: 3
        };

        const response = await nango.get(config);
        const data: unknown = response.data;

        return OutputSchema.parse(data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
