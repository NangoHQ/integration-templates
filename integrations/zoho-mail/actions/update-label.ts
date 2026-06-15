import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from '@nangohq/runner-sdk';

const InputSchema = z
    .object({
        accountId: z.string().describe('Account ID. Example: 4845214000000008002'),
        labelId: z.string().describe('Label ID. Example: 4845214000000011002'),
        labelName: z.string().optional().describe('New display name for the label'),
        color: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/, 'color must be a 6-digit hex code, e.g. #FF0000')
            .optional()
            .describe('Hex color code for the label. Example: #FF0000')
    })
    .refine((data) => data.labelName !== undefined || data.color !== undefined, {
        message: 'At least one of labelName or color must be provided'
    });

const ProviderResponseSchema = z.object({
    status: z.object({
        code: z.number(),
        description: z.string()
    }),
    data: z.unknown().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    labelName: z.string().optional(),
    color: z.string().optional()
});

const action = createAction({
    description: "Update a label's name or color in Zoho Mail.",
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-label',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.tags.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.zoho.com/mail/help/api/put-update-label.html
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/labels/${encodeURIComponent(input.labelId)}`,
            data: {
                ...(input.labelName !== undefined && { displayName: input.labelName }),
                ...(input.color !== undefined && { color: input.color })
            },
            retries: 3
        };

        const response = await nango.put(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status.code !== 200) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: `Failed to update label: ${providerResponse.status.description}`,
                code: providerResponse.status.code
            });
        }

        return {
            id: input.labelId,
            ...(input.labelName !== undefined && { labelName: input.labelName }),
            ...(input.color !== undefined && { color: input.color })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
