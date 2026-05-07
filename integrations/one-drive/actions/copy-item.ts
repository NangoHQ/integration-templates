import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    itemId: z.string().describe('The ID of the file or folder to copy. Example: "01A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7"'),
    targetParentId: z.string().describe('The ID of the destination folder where the item should be copied. Example: "targetFolderId123"'),
    newName: z.string().optional().describe('Optional new name for the copied item. If not provided, the original name will be used.')
});

const MonitorResponseSchema = z.object({
    id: z.string().optional(),
    status: z.string().optional(),
    error: z
        .object({
            code: z.string(),
            message: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    itemId: z.string().optional(),
    status: z.string().optional(),
    error: z
        .object({
            code: z.string(),
            message: z.string()
        })
        .optional()
});

const action = createAction({
    description: 'Copy a file or folder to another location',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/copy-item',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const copyBody: {
            parentReference: { id: string };
            name?: string;
        } = {
            parentReference: {
                id: input.targetParentId
            }
        };

        if (input.newName !== undefined) {
            copyBody.name = input.newName;
        }

        // https://learn.microsoft.com/graph/api/driveitem-copy
        const copyResponse = await nango.post({
            endpoint: `/v1.0/me/drive/items/${encodeURIComponent(input.itemId)}/copy`,
            data: copyBody,
            retries: 3
        });

        // Handle synchronous success (200) or async accepted (202)
        if (copyResponse.status === 200) {
            // Copy completed synchronously
            return {
                success: true,
                status: 'completed'
            };
        }

        if (copyResponse.status !== 202) {
            throw new nango.ActionError({
                type: 'copy_failed',
                message: `Unexpected response status: ${copyResponse.status}`,
                status: copyResponse.status
            });
        }

        const monitorUrl = copyResponse.headers?.['location'];

        if (!monitorUrl) {
            return {
                success: true,
                status: 'accepted'
            };
        }

        // Poll the monitor URL for completion (up to 30 seconds)
        const maxAttempts = 10;
        const pollIntervalMs = 3000;
        let attempts = 0;

        while (attempts < maxAttempts) {
            attempts += 1;

            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

            // https://learn.microsoft.com/graph/api/asyncstatus-get
            const monitorResponse = await nango.get({
                endpoint: monitorUrl,
                baseUrlOverride: 'https://graph.microsoft.com',
                retries: 3
            });

            const monitorData = MonitorResponseSchema.safeParse(monitorResponse.data);

            if (!monitorData.success) {
                continue;
            }

            const status = monitorData.data.status;

            if (status === 'completed') {
                return {
                    success: true,
                    itemId: monitorData.data.id,
                    status: 'completed'
                };
            }

            if (status === 'failed') {
                throw new nango.ActionError({
                    type: 'copy_failed',
                    message: monitorData.data.error?.message || 'Copy operation failed',
                    code: monitorData.data.error?.code
                });
            }

            if (status === 'cancelled') {
                throw new nango.ActionError({
                    type: 'copy_cancelled',
                    message: 'Copy operation was cancelled'
                });
            }
        }

        return {
            success: true,
            status: 'inProgress'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
