import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    url: z.string().describe('URL of the shared link to change its settings. Example: "https://www.dropbox.com/s/abc123/file.txt"'),
    settings: z
        .object({
            requested_visibility: z
                .enum(['public', 'team_only', 'password'])
                .optional()
                .describe('Use `audience` instead. The requested access for this shared link.'),
            audience: z.enum(['public', 'team', 'no_one', 'members']).optional().describe('The new audience who can benefit from the access level.'),
            access: z
                .enum(['viewer', 'editor', 'max'])
                .optional()
                .describe('Requested access level. Note: modifying access level for an existing link is not supported.'),
            expires: z.string().optional().describe("Expiration time of the shared link in ISO 8601 format. By default the link won't expire."),
            require_password: z.boolean().optional().describe('Boolean flag to enable or disable password protection.'),
            link_password: z.string().optional().describe('If require_password is true, this specifies the password to access the link.'),
            allow_download: z.boolean().optional().describe('Boolean flag to allow or disallow download capabilities for shared links.')
        })
        .optional()
        .describe('Set of settings for the shared link.'),
    remove_expiration: z.boolean().optional().describe('If set to true, removes the expiration of the shared link.')
});

// Helper to extract tag value from Dropbox API enum objects
function extractTagValue(obj: unknown): string | undefined {
    if (obj && typeof obj === 'object' && obj !== null) {
        // Check for .tag property using Zod schema
        const TagSchema = z.object({ '.tag': z.string() });
        const TagAltSchema = z.object({ tag: z.string() });
        const result = TagSchema.safeParse(obj);
        if (result.success) {
            return result.data['.tag'];
        }
        const resultAlt = TagAltSchema.safeParse(obj);
        if (resultAlt.success) {
            return resultAlt.data.tag;
        }
    }
    if (typeof obj === 'string') {
        return obj;
    }
    return undefined;
}

const OutputSchema = z.object({
    url: z.string(),
    name: z.string().optional(),
    link_permissions: z
        .object({
            can_revoke: z.boolean().optional(),
            resolved_visibility: z.enum(['public', 'team_only', 'password', 'team_and_password', 'shared_folder_only', 'no_one']).optional(),
            requested_visibility: z.enum(['public', 'team_only', 'password']).optional(),
            effective_audience: z.enum(['public', 'team', 'no_one', 'members']).optional(),
            link_access_level: z.enum(['viewer', 'editor', 'max']).optional(),
            can_set_expiration: z.boolean().optional(),
            can_set_password: z.boolean().optional(),
            can_remove_password: z.boolean().optional(),
            allow_download: z.boolean().optional(),
            can_allow_download: z.boolean().optional(),
            require_password: z.boolean().optional(),
            can_request_password: z.boolean().optional()
        })
        .optional(),
    expires: z.string().optional(),
    path_lower: z.string().optional(),
    file_id: z.string().optional(),
    id: z.string().optional(),
    client_modified: z.string().optional(),
    server_modified: z.string().optional(),
    rev: z.string().optional(),
    size: z.number().optional(),
    is_downloadable: z.boolean().optional()
});

const action = createAction({
    description: 'Update settings on an existing Dropbox shared link.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['sharing.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build the request body, only including fields that are provided
        const requestBody: Record<string, unknown> = {
            url: input.url
        };

        if (input.settings) {
            const settings: Record<string, unknown> = {};

            if (input.settings['requested_visibility'] !== undefined) {
                settings['requested_visibility'] = input.settings['requested_visibility'];
            }

            if (input.settings['audience'] !== undefined) {
                settings['audience'] = input.settings['audience'];
            }

            if (input.settings['access'] !== undefined) {
                settings['access'] = input.settings['access'];
            }

            if (input.settings['expires'] !== undefined) {
                settings['expires'] = input.settings['expires'];
            }

            if (input.settings['require_password'] !== undefined) {
                settings['require_password'] = input.settings['require_password'];
            }

            if (input.settings['link_password'] !== undefined) {
                settings['link_password'] = input.settings['link_password'];
            }

            if (input.settings['allow_download'] !== undefined) {
                settings['allow_download'] = input.settings['allow_download'];
            }

            requestBody['settings'] = settings;
        }

        if (input.remove_expiration !== undefined) {
            requestBody['remove_expiration'] = input.remove_expiration;
        }

        // https://www.dropbox.com/developers/documentation/http/documentation#sharing-modify_shared_link_settings
        const response = await nango.post({
            endpoint: '/2/sharing/modify_shared_link_settings',
            data: requestBody,
            retries: 3
        });

        // Parse response using Zod to validate the data structure
        const ResponseSchema = z.object({
            url: z.string(),
            name: z.string().optional(),
            link_permissions: z
                .object({
                    can_revoke: z.boolean().optional(),
                    resolved_visibility: z.union([z.string(), z.object({ '.tag': z.string() })]).optional(),
                    requested_visibility: z.union([z.string(), z.object({ '.tag': z.string() })]).optional(),
                    effective_audience: z.union([z.string(), z.object({ '.tag': z.string() })]).optional(),
                    link_access_level: z.union([z.string(), z.object({ '.tag': z.string() })]).optional(),
                    can_set_expiration: z.boolean().optional(),
                    can_set_password: z.boolean().optional(),
                    can_remove_password: z.boolean().optional(),
                    allow_download: z.boolean().optional(),
                    can_allow_download: z.boolean().optional(),
                    require_password: z.boolean().optional(),
                    can_request_password: z.boolean().optional()
                })
                .optional(),
            expires: z.string().optional(),
            path_lower: z.string().optional(),
            file_id: z.string().optional(),
            id: z.string().optional(),
            client_modified: z.string().optional(),
            server_modified: z.string().optional(),
            rev: z.string().optional(),
            size: z.number().optional(),
            is_downloadable: z.boolean().optional()
        });

        const parsed = ResponseSchema.parse(response.data);

        // Helper to convert string to union type
        const toVisibility = (
            val: string | undefined
        ): 'public' | 'team_only' | 'password' | 'team_and_password' | 'shared_folder_only' | 'no_one' | undefined => {
            if (!val) return undefined;
            if (val === 'public') return 'public';
            if (val === 'team_only') return 'team_only';
            if (val === 'password') return 'password';
            if (val === 'team_and_password') return 'team_and_password';
            if (val === 'shared_folder_only') return 'shared_folder_only';
            if (val === 'no_one') return 'no_one';
            return undefined;
        };

        const toRequestedVisibility = (val: string | undefined): 'public' | 'team_only' | 'password' | undefined => {
            if (!val) return undefined;
            if (val === 'public') return 'public';
            if (val === 'team_only') return 'team_only';
            if (val === 'password') return 'password';
            return undefined;
        };

        const toAudience = (val: string | undefined): 'public' | 'team' | 'no_one' | 'members' | undefined => {
            if (!val) return undefined;
            if (val === 'public') return 'public';
            if (val === 'team') return 'team';
            if (val === 'no_one') return 'no_one';
            if (val === 'members') return 'members';
            return undefined;
        };

        const toAccessLevel = (val: string | undefined): 'viewer' | 'editor' | 'max' | undefined => {
            if (!val) return undefined;
            if (val === 'viewer') return 'viewer';
            if (val === 'editor') return 'editor';
            if (val === 'max') return 'max';
            return undefined;
        };

        return {
            url: parsed.url,
            name: parsed.name,
            link_permissions: parsed.link_permissions
                ? {
                      can_revoke: parsed.link_permissions.can_revoke,
                      resolved_visibility: toVisibility(extractTagValue(parsed.link_permissions.resolved_visibility)),
                      requested_visibility: toRequestedVisibility(extractTagValue(parsed.link_permissions.requested_visibility)),
                      effective_audience: toAudience(extractTagValue(parsed.link_permissions.effective_audience)),
                      link_access_level: toAccessLevel(extractTagValue(parsed.link_permissions.link_access_level)),
                      can_set_expiration: parsed.link_permissions.can_set_expiration,
                      can_set_password: parsed.link_permissions.can_set_password,
                      can_remove_password: parsed.link_permissions.can_remove_password,
                      allow_download: parsed.link_permissions.allow_download,
                      can_allow_download: parsed.link_permissions.can_allow_download,
                      require_password: parsed.link_permissions.require_password,
                      can_request_password: parsed.link_permissions.can_request_password
                  }
                : undefined,
            expires: parsed.expires,
            path_lower: parsed.path_lower,
            file_id: parsed.file_id,
            id: parsed.id,
            client_modified: parsed.client_modified,
            server_modified: parsed.server_modified,
            rev: parsed.rev,
            size: parsed.size,
            is_downloadable: parsed.is_downloadable
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
