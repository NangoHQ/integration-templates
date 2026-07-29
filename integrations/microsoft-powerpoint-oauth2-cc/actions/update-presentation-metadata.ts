import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('Item ID. Example: "01RFYLAYBX27CGEGAJH5HZMVYI6Y3NGGYJ"'),
    name: z.string().optional().describe('New name for the presentation. Omit to keep unchanged.'),
    description: z.string().nullable().optional().describe('New description for the presentation. Pass null to clear.')
});

const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    webUrl: z.string().nullable().optional(),
    size: z.number().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    lastModifiedDateTime: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    webUrl: z.string().optional(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
});

const action = createAction({
    description: 'Rename a presentation or update its description, without touching content',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.name === undefined && input.description === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of name or description must be provided'
            });
        }

        const response = await nango.patch({
            // https://learn.microsoft.com/en-us/graph/api/driveitem-update
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 1
        });

        const providerItem = ProviderDriveItemSchema.parse(response.data);

        return {
            id: providerItem.id,
            name: providerItem.name,
            ...(providerItem.description != null && { description: providerItem.description }),
            ...(providerItem.webUrl != null && { webUrl: providerItem.webUrl }),
            ...(providerItem.size != null && { size: providerItem.size }),
            ...(providerItem.createdDateTime != null && { createdDateTime: providerItem.createdDateTime }),
            ...(providerItem.lastModifiedDateTime != null && { lastModifiedDateTime: providerItem.lastModifiedDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
