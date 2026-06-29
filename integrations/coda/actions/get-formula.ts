import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('ID of the Coda doc. Example: "L_hgEASd6n"'),
    formulaIdOrName: z.string().describe('ID or name of the formula. Example: "f-fgHijkLm"')
});

const ParentSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        href: z.string(),
        browserLink: z.string(),
        name: z.string()
    })
    .optional();

const ScalarValueSchema = z.union([z.string(), z.number(), z.boolean()]);
const FormulaValueSchema = z.union([ScalarValueSchema, z.array(ScalarValueSchema), z.array(z.array(ScalarValueSchema))]);

const ProviderFormulaSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string(),
    name: z.string(),
    value: FormulaValueSchema,
    parent: z
        .object({
            id: z.string(),
            type: z.string(),
            href: z.string(),
            browserLink: z.string(),
            name: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string(),
    name: z.string(),
    value: FormulaValueSchema,
    parent: ParentSchema
});

const action = createAction({
    description: 'Retrieve a single named formula by ID or name.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/actions/get-formula' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://coda.io/developers/apis/v1#tag/Formulas/operation/getFormula
            endpoint: `/docs/${encodeURIComponent(input.docId)}/formulas/${encodeURIComponent(input.formulaIdOrName)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Formula not found',
                docId: input.docId,
                formulaIdOrName: input.formulaIdOrName
            });
        }

        const providerFormula = ProviderFormulaSchema.parse(response.data);

        return {
            id: providerFormula.id,
            type: providerFormula.type,
            href: providerFormula.href,
            name: providerFormula.name,
            value: providerFormula.value,
            ...(providerFormula.parent !== undefined && { parent: providerFormula.parent })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
