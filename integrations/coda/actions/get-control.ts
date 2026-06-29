import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('ID of the Coda doc. Example: "L_hgEASd6n"'),
    controlIdOrName: z.string().describe('ID or name of the control. Example: "ctrl-F38u5bVLOn"')
});

const ProviderPageSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional()
});

const ScalarValueSchema = z.union([z.string(), z.number(), z.boolean()]);
const ValueSchema = z.union([ScalarValueSchema, z.array(ScalarValueSchema), z.array(z.array(ScalarValueSchema))]);

const ProviderControlSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string(),
    name: z.string(),
    controlType: z.string(),
    value: ValueSchema.nullable().optional(),
    parent: ProviderPageSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string(),
    name: z.string(),
    controlType: z.string(),
    value: z.unknown().optional(),
    parent: ProviderPageSchema.optional()
});

const action = createAction({
    description: 'Retrieve a single control by ID or name.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://coda.io/developers/apis/v1
            endpoint: `/docs/${encodeURIComponent(input.docId)}/controls/${encodeURIComponent(input.controlIdOrName)}`,
            retries: 3
        });

        const providerControl = ProviderControlSchema.parse(response.data);

        return {
            id: providerControl.id,
            type: providerControl.type,
            href: providerControl.href,
            name: providerControl.name,
            controlType: providerControl.controlType,
            ...(providerControl.value != null && { value: providerControl.value }),
            ...(providerControl.parent !== undefined && { parent: providerControl.parent })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
