import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z
        .string()
        .describe('The ID of the drive containing the presentation. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('The ID of the driveItem representing the presentation. Example: "01RFYLAYBX27CGEGAJH5HZMVYI6Y3NGGYJ"')
});

const DriveItemSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        size: z.number().nullable().optional(),
        webUrl: z.string().nullable().optional(),
        createdDateTime: z.string().nullable().optional(),
        lastModifiedDateTime: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        file: z
            .object({
                mimeType: z.string().optional(),
                hashes: z.record(z.string(), z.unknown()).optional()
            })
            .optional(),
        parentReference: z
            .object({
                driveId: z.string().optional(),
                id: z.string().optional(),
                path: z.string().optional()
            })
            .optional(),
        createdBy: z
            .object({
                user: z
                    .object({
                        displayName: z.string().optional(),
                        email: z.string().optional()
                    })
                    .optional()
            })
            .optional(),
        lastModifiedBy: z
            .object({
                user: z
                    .object({
                        displayName: z.string().optional(),
                        email: z.string().optional()
                    })
                    .optional()
            })
            .optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve driveItem metadata for a presentation',
    version: '1.0.0',
    input: InputSchema,
    output: DriveItemSchema,
    scopes: ['Files.Read.All'],

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/driveitem-get
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Presentation not found',
                driveId: input.driveId,
                itemId: input.itemId
            });
        }

        const driveItem = DriveItemSchema.parse(response.data);
        return driveItem;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
