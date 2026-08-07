import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const SensitiveDataScannerGroupItemSchema = z.object({
    id: z.string(),
    type: z.string()
});

const SensitiveDataScannerConfigurationRelationshipsSchema = z.object({
    groups: z
        .object({
            data: z.array(SensitiveDataScannerGroupItemSchema).optional()
        })
        .optional()
});

const SensitiveDataScannerGetConfigResponseDataSchema = z
    .object({
        id: z.string().optional(),
        type: z.string().optional(),
        attributes: z.record(z.string(), z.unknown()).optional(),
        relationships: SensitiveDataScannerConfigurationRelationshipsSchema.optional()
    })
    .passthrough();

const SensitiveDataScannerMetaSchema = z
    .object({
        count_limit: z.number().optional(),
        group_count_limit: z.number().optional(),
        has_highlight_enabled: z.boolean().optional(),
        has_multi_pass_enabled: z.boolean().optional(),
        is_pci_compliant: z.boolean().optional(),
        version: z.number().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        data: SensitiveDataScannerGetConfigResponseDataSchema.optional(),
        included: z.array(z.record(z.string(), z.unknown())).optional(),
        meta: SensitiveDataScannerMetaSchema.optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get the full Sensitive Data Scanner configuration tree (scanning groups and rules).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.datadoghq.com/api/latest/sensitive-data-scanner
        const response = await nango.get({
            endpoint: 'v2/sensitive-data-scanner/config',
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Sensitive Data Scanner API.'
            });
        }

        const parsed = OutputSchema.parse(raw);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
