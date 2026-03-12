import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    drive_id: z.string().describe('The ID of the shared drive to update. Example: "0AN1234567890XYZ"'),
    name: z.string().optional().describe('The new name for the shared drive. Example: "Updated Shared Drive"'),
    color_rgb: z.string().optional().describe('The color of the shared drive as an RGB hex string. Example: "#0000FF"'),
    restrictions: z
        .object({
            admin_managed_restrictions: z.boolean().optional().describe('Whether the restrictions are managed by an admin'),
            copy_requires_writer_permission: z.boolean().optional().describe('Whether the copy operation requires writer permission'),
            domain_users_only: z.boolean().optional().describe('Whether only domain users can access the shared drive'),
            drive_members_only: z.boolean().optional().describe('Whether only drive members can access the shared drive')
        })
        .optional()
        .describe('Restrictions to apply to the shared drive')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    color_rgb: z.union([z.string(), z.null()]),
    kind: z.string(),
    created_time: z.union([z.string(), z.null()]),
    restrictions: z
        .object({
            admin_managed_restrictions: z.boolean().optional(),
            copy_requires_writer_permission: z.boolean().optional(),
            domain_users_only: z.boolean().optional(),
            drive_members_only: z.boolean().optional()
        })
        .optional()
});

const action = createAction({
    description: "Update a shared drive's metadata",
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/update-shared-drive',
        group: 'Shared Drives'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: any = {};

        if (input.name !== undefined) {
            requestBody.name = input.name;
        }

        if (input.color_rgb !== undefined) {
            requestBody.colorRgb = input.color_rgb;
        }

        if (input.restrictions !== undefined) {
            requestBody.restrictions = {};
            if (input.restrictions.admin_managed_restrictions !== undefined) {
                requestBody.restrictions.adminManagedRestrictions = input.restrictions.admin_managed_restrictions;
            }
            if (input.restrictions.copy_requires_writer_permission !== undefined) {
                requestBody.restrictions.copyRequiresWriterPermission = input.restrictions.copy_requires_writer_permission;
            }
            if (input.restrictions.domain_users_only !== undefined) {
                requestBody.restrictions.domainUsersOnly = input.restrictions.domain_users_only;
            }
            if (input.restrictions.drive_members_only !== undefined) {
                requestBody.restrictions.driveMembersOnly = input.restrictions.drive_members_only;
            }
        }

        // https://developers.google.com/workspace/drive/api/reference/rest/v3/drives/update
        const response = await nango.patch({
            endpoint: `/drive/v3/drives/${input.drive_id}`,
            params: {
                useDomainAdminAccess: 'false'
            },
            data: requestBody,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Shared drive not found or could not be updated',
                drive_id: input.drive_id
            });
        }

        const drive = response.data;

        return {
            id: drive.id,
            name: drive.name ?? null,
            color_rgb: drive.colorRgb ?? null,
            kind: drive.kind ?? 'drive#drive',
            created_time: drive.createdTime ?? null,
            restrictions: drive.restrictions
                ? {
                      admin_managed_restrictions: drive.restrictions.adminManagedRestrictions,
                      copy_requires_writer_permission: drive.restrictions.copyRequiresWriterPermission,
                      domain_users_only: drive.restrictions.domainUsersOnly,
                      drive_members_only: drive.restrictions.driveMembersOnly
                  }
                : undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
