import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('Custom tag ID. Example: "019f1a5b-d034-7f35-840b-685069e56a08"'),
        label: z.string().optional().describe('New display label for the custom tag. Example: "Important"'),
        description: z
            .string()
            .nullable()
            .optional()
            .describe('Detailed description of the custom tag purpose. Set to null to clear. Example: "Used for marking important items"')
    })
    .refine((data) => data.label !== undefined || data.description !== undefined, {
        message: 'At least one of label or description must be provided'
    });

const ProviderCustomTagSchema = z.object({
    id: z.string(),
    timestamp_created: z.string(),
    timestamp_updated: z.string(),
    organization_id: z.string(),
    label: z.string(),
    description: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    timestamp_created: z.string(),
    timestamp_updated: z.string(),
    organization_id: z.string(),
    label: z.string(),
    description: z.string().optional()
});

const action = createAction({
    description: 'Patch a custom tag',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['custom_tags:update'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const patchData: {
            label?: string;
            description?: string | null;
        } = {};

        if (input.label !== undefined) {
            patchData.label = input.label;
        }

        if (input.description !== undefined) {
            patchData.description = input.description;
        }

        // https://developer.instantly.ai/api-reference/customtag/patch-custom-tag
        const response = await nango.patch({
            endpoint: `/v2/custom-tags/${encodeURIComponent(input.id)}`,
            data: patchData,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Custom tag not found or update failed',
                id: input.id
            });
        }

        const providerTag = ProviderCustomTagSchema.parse(response.data);

        return {
            id: providerTag.id,
            timestamp_created: providerTag.timestamp_created,
            timestamp_updated: providerTag.timestamp_updated,
            organization_id: providerTag.organization_id,
            label: providerTag.label,
            ...(providerTag.description != null && { description: providerTag.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
