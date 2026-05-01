import { z } from 'zod';
import { createAction } from 'nango';

// Provider documentation: https://www.dropbox.com/developers/documentation/http/documentation#sharing-list_shared_links

const InputSchema = z.object({
    path: z.string().optional().describe('Path to the file or folder to get shared links for. If not provided, returns all shared links for the current user.'),
    cursor: z
        .string()
        .optional()
        .describe('Cursor returned from previous call to get the next page of results. Cursor is only returned when no path is provided.'),
    direct_only: z
        .boolean()
        .optional()
        .describe('If true, only return links directly to the given path. If false or omitted, also return links to parent folders.')
});

const LinkPermissionsSchema = z
    .object({
        can_revoke: z.boolean().optional(),
        resolved_visibility: z
            .object({
                '.tag': z.string()
            })
            .optional(),
        requested_visibility: z
            .object({
                '.tag': z.string()
            })
            .optional(),
        revoke_failure_reason: z
            .object({
                '.tag': z.string()
            })
            .optional()
    })
    .passthrough();

const SharedLinkMetadataSchema = z
    .object({
        '.tag': z.enum(['file', 'folder']),
        url: z.string(),
        id: z.string(),
        name: z.string(),
        path_lower: z.string(),
        link_permissions: LinkPermissionsSchema.optional(),
        team_member_info: z
            .object({
                team_info: z.object({
                    id: z.string(),
                    name: z.string()
                }),
                display_name: z.string(),
                member_id: z.string(),
                email: z.string().optional()
            })
            .optional(),
        expires: z.string().optional(),
        content_owner_team_info: z
            .object({
                id: z.string(),
                name: z.string()
            })
            .optional()
    })
    .passthrough();

const ProviderOutputSchema = z.object({
    links: z.array(SharedLinkMetadataSchema),
    has_more: z.boolean(),
    cursor: z.string().optional()
});

const OutputSchema = z.object({
    links: z.array(SharedLinkMetadataSchema),
    has_more: z.boolean(),
    cursor: z.string().optional()
});

const action = createAction({
    description: 'List shared links for the current user or for a specific path',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-shared-links',
        group: 'Sharing'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['sharing.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {};

        if (input.path !== undefined) {
            requestBody['path'] = input.path;
        }

        if (input.cursor !== undefined) {
            requestBody['cursor'] = input.cursor;
        }

        if (input.direct_only !== undefined) {
            requestBody['direct_only'] = input.direct_only;
        }

        // https://www.dropbox.com/developers/documentation/http/documentation#sharing-list_shared_links
        const response = await nango.post({
            endpoint: '/2/sharing/list_shared_links',
            data: requestBody,
            retries: 3
        });

        const result = ProviderOutputSchema.parse(response.data);

        return {
            links: result.links,
            has_more: result.has_more,
            ...(result.cursor !== undefined && { cursor: result.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
