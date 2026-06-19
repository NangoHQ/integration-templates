import { z } from 'zod';
import { createAction } from 'nango';

const VisibilityEnum = z.enum(['public', 'password', 'team_only']);
const AudienceEnum = z.enum(['public', 'team', 'no_one', 'members']);
const AccessEnum = z.enum(['viewer', 'viewer_no_comment', 'editor', 'owner']);

const LinkSettingsSchema = z.object({
    requested_visibility: VisibilityEnum.optional().describe(
        'The requested visibility for the shared link. Can be public, password (link is publicly visible, but only accessible with the password), or team_only (only members of the same team can access).'
    ),
    audience: AudienceEnum.optional().describe(
        'The audience of the shared link. Can be public (anyone with the link can access), team (only members of the same team can access), no_one (link is disabled), or members (only specific members can access).'
    ),
    access: AccessEnum.optional().describe('The access level on the link. Can be viewer, viewer_no_comment (can view but not comment), editor, or owner.'),
    allow_download: z.boolean().optional().describe('Whether to allow downloads via the shared link.'),
    password: z.string().optional().describe('The password for the shared link. Required if requested_visibility is set to password.'),
    expires: z.string().optional().describe('The expiration time for the shared link in ISO 8601 format (e.g., 2025-12-31T23:59:59Z).')
});

const InputSchema = z.object({
    path: z.string().describe('The path to the file or folder in the Dropbox account. Example: /folder/file.txt'),
    settings: LinkSettingsSchema.optional().describe(
        'Optional settings for the shared link including visibility, audience, access level, password, and expiry.'
    )
});

const LinkPermissionsSchema = z
    .object({
        can_revoke: z.boolean().optional(),
        resolved_visibility: z
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

const ProviderResponseSchema = z
    .object({
        url: z.string(),
        name: z.string(),
        path_lower: z.string(),
        link_permissions: LinkPermissionsSchema.optional(),
        expiry: z.string().optional(),
        password_protected: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    url: z.string().describe('The shared link URL that can be used to access the file or folder.'),
    name: z.string().describe('The name of the file or folder.'),
    path: z.string().describe('The lowercased full path to the file or folder.'),
    link_permissions: z.object({}).passthrough().optional().describe('The permissions associated with the shared link.'),
    expiry: z.string().optional().describe('The expiration time of the shared link if set.'),
    password_protected: z.boolean().optional().describe('Whether the shared link is password protected.')
});

const action = createAction({
    description: 'Create a shared link for a Dropbox file or folder with optional settings.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['sharing.write', 'files.content.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.settings?.requested_visibility === 'password' && !input.settings?.password) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'password is required when requested_visibility is "password"'
            });
        }

        const requestBody: Record<string, unknown> = {
            path: input.path
        };

        if (input.settings) {
            const settings: Record<string, unknown> = {};

            if (input.settings.requested_visibility !== undefined) {
                settings['requested_visibility'] = input.settings.requested_visibility;
            }
            if (input.settings.audience !== undefined) {
                settings['audience'] = input.settings.audience;
            }
            if (input.settings.access !== undefined) {
                settings['access'] = input.settings.access;
            }
            if (input.settings.allow_download !== undefined) {
                settings['allow_download'] = input.settings.allow_download;
            }
            if (input.settings.password !== undefined) {
                settings['password'] = input.settings.password;
            }
            if (input.settings.expires !== undefined) {
                settings['expires'] = input.settings.expires;
            }

            if (Object.keys(settings).length > 0) {
                requestBody['settings'] = settings;
            }
        }

        // https://www.dropbox.com/developers/documentation/http/documentation#sharing-create_shared_link_with_settings
        const response = await nango.post({
            endpoint: '/2/sharing/create_shared_link_with_settings',
            data: requestBody,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create shared link: empty response from Dropbox API'
            });
        }

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse API response',
                error: parsedResponse.error.message
            });
        }

        const providerData = parsedResponse.data;

        return {
            url: providerData.url,
            name: providerData.name,
            path: providerData.path_lower,
            ...(providerData.link_permissions !== undefined && { link_permissions: providerData.link_permissions }),
            ...(providerData.expiry !== undefined && { expiry: providerData.expiry }),
            ...(providerData.password_protected !== undefined && { password_protected: providerData.password_protected })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
