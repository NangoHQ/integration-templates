import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID containing the workbook. Example: "b!abc123"'),
    itemId: z.string().describe('Workbook item ID. Example: "01RFYLAYDQCQAOBGW2GVAYDEQMDDBL6JYU"')
});

const NamedItemSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    comment: z.string().optional().nullable(),
    scope: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
    value: z.unknown().optional().nullable(),
    visible: z.boolean().optional().nullable()
});

const OutputSchema = z.object({
    names: z.array(NamedItemSchema)
});

const ProviderResponseSchema = z
    .object({
        value: z.array(
            z
                .object({
                    id: z.string().nullish(),
                    name: z.string(),
                    comment: z.string().nullish(),
                    scope: z.string().nullish(),
                    type: z.string().nullish(),
                    value: z.unknown().nullish(),
                    visible: z.boolean().nullish()
                })
                .passthrough()
        )
    })
    .passthrough();

const action = createAction({
    description: 'List workbook-level defined names.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read.All', 'Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/resources/nameditem
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/workbook/names`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: `Failed to parse workbook names response: ${parsed.error.message}`
            });
        }

        const names = parsed.data.value.map((item) => {
            return {
                ...(item.id != null && { id: item.id }),
                name: item.name,
                ...(item.comment != null && { comment: item.comment }),
                ...(item.scope != null && { scope: item.scope }),
                ...(item.type != null && { type: item.type }),
                ...(item.value !== undefined && { value: item.value }),
                ...(item.visible != null && { visible: item.visible })
            };
        });

        return { names };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
