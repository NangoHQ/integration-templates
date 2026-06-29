import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('ID of the doc. Example: "AbCDeFGH"'),
    tableIdOrName: z.string().describe('ID or name of the table. Example: "grid-pqRst-U"'),
    rowIdOrName: z.string().describe('ID or name of the row. Example: "i-tuVwxYz"'),
    useColumnNames: z.boolean().optional().describe('Use column names instead of column IDs in the returned output.'),
    valueFormat: z.enum(['simple', 'simpleWithArrays', 'rich']).optional().describe('The format that cell values are returned as.')
});

const ProviderRowSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string().optional(),
    name: z.string().optional(),
    index: z.number().optional(),
    browserLink: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    values: z.record(z.string(), z.unknown()).optional(),
    parent: z
        .object({
            id: z.string(),
            type: z.string(),
            tableType: z.string().optional(),
            href: z.string().optional(),
            browserLink: z.string().optional(),
            name: z.string().optional(),
            parent: z
                .object({
                    id: z.string(),
                    type: z.string(),
                    href: z.string().optional(),
                    browserLink: z.string().optional(),
                    name: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string().optional(),
    name: z.string().optional(),
    index: z.number().optional(),
    browserLink: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    values: z.record(z.string(), z.unknown()).optional(),
    parent: z
        .object({
            id: z.string(),
            type: z.string(),
            tableType: z.string().optional(),
            href: z.string().optional(),
            browserLink: z.string().optional(),
            name: z.string().optional(),
            parent: z
                .object({
                    id: z.string(),
                    type: z.string(),
                    href: z.string().optional(),
                    browserLink: z.string().optional(),
                    name: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve a single row by ID or name.',
    version: '1.0.0',
    endpoint: {
        path: '/actions/get-row',
        method: 'GET'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['doc:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: { useColumnNames?: string; valueFormat?: string } = {};
        if (input.useColumnNames !== undefined) {
            params.useColumnNames = String(input.useColumnNames);
        }
        if (input.valueFormat !== undefined) {
            params.valueFormat = input.valueFormat;
        }

        const response = await nango.get({
            // https://coda.io/developers/apis/v1#tag/Rows/operation/getRow
            endpoint: `/docs/${encodeURIComponent(input.docId)}/tables/${encodeURIComponent(input.tableIdOrName)}/rows/${encodeURIComponent(input.rowIdOrName)}`,
            params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Row not found.',
                docId: input.docId,
                tableIdOrName: input.tableIdOrName,
                rowIdOrName: input.rowIdOrName
            });
        }

        const providerRow = ProviderRowSchema.parse(response.data);

        return {
            id: providerRow.id,
            type: providerRow.type,
            ...(providerRow.href !== undefined && { href: providerRow.href }),
            ...(providerRow.name !== undefined && { name: providerRow.name }),
            ...(providerRow.index !== undefined && { index: providerRow.index }),
            ...(providerRow.browserLink !== undefined && { browserLink: providerRow.browserLink }),
            ...(providerRow.createdAt !== undefined && { createdAt: providerRow.createdAt }),
            ...(providerRow.updatedAt !== undefined && { updatedAt: providerRow.updatedAt }),
            ...(providerRow.values !== undefined && { values: providerRow.values }),
            ...(providerRow.parent !== undefined && {
                parent: {
                    id: providerRow.parent.id,
                    type: providerRow.parent.type,
                    ...(providerRow.parent.tableType !== undefined && { tableType: providerRow.parent.tableType }),
                    ...(providerRow.parent.href !== undefined && { href: providerRow.parent.href }),
                    ...(providerRow.parent.browserLink !== undefined && { browserLink: providerRow.parent.browserLink }),
                    ...(providerRow.parent.name !== undefined && { name: providerRow.parent.name }),
                    ...(providerRow.parent.parent !== undefined && {
                        parent: {
                            id: providerRow.parent.parent.id,
                            type: providerRow.parent.parent.type,
                            ...(providerRow.parent.parent.href !== undefined && { href: providerRow.parent.parent.href }),
                            ...(providerRow.parent.parent.browserLink !== undefined && { browserLink: providerRow.parent.parent.browserLink }),
                            ...(providerRow.parent.parent.name !== undefined && { name: providerRow.parent.parent.name })
                        }
                    })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
