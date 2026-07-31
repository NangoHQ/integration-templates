import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(10000).optional().describe('Maximum number of items to return per page. Default: 100.')
});

const UnitOfMeasureSchema = z.object({
    UnitSymbol: z.string(),
    UnitDescription: z.string().optional().nullable(),
    UnitClass: z.string().optional().nullable(),
    DecimalPrecision: z.number().optional().nullable(),
    IsBaseUnit: z.boolean().optional().nullable(),
    IsFixedUnitSymbolAssigned: z.boolean().optional().nullable(),
    SystemOfUnits: z.string().optional().nullable(),
    IsSystemUnit: z.boolean().optional().nullable(),
    FixedUnitSymbolAssignment: z.string().optional().nullable(),
    NationalCode: z.string().optional().nullable()
});

const OutputSchema = z.object({
    items: z.array(UnitOfMeasureSchema),
    next_cursor: z.string().optional()
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(raw: Record<string, unknown>, key: string): string | undefined {
    const val = raw[key];
    if (val === undefined || val === null) {
        return undefined;
    }
    return String(val);
}

function getNumber(raw: Record<string, unknown>, key: string): number | undefined {
    const val = raw[key];
    if (val === undefined || val === null) {
        return undefined;
    }
    return Number(val);
}

function getBoolean(raw: Record<string, unknown>, key: string): boolean | undefined {
    const val = raw[key];
    if (val === undefined || val === null) {
        return undefined;
    }
    if (typeof val === 'boolean') {
        return val;
    }
    if (typeof val === 'string') {
        const lower = val.toLowerCase();
        if (lower === 'yes' || lower === 'true') {
            return true;
        }
        if (lower === 'no' || lower === 'false') {
            return false;
        }
    }
    if (typeof val === 'number') {
        return val !== 0;
    }
    return undefined;
}

const action = createAction({
    description: 'List units of measure.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: '/data/UnitsOfMeasure',
            params: {
                $top: String(limit),
                $skip: String(skip),
                $count: 'true'
            },
            retries: 3
        });

        const data = response.data;
        if (!isRecord(data) || !Array.isArray(data['value'])) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from UnitsOfMeasure endpoint.'
            });
        }

        const items = data['value'].map((item: unknown) => {
            if (!isRecord(item)) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected item format in UnitsOfMeasure response.'
                });
            }

            const unitSymbol = getString(item, 'UnitSymbol');
            if (unitSymbol === undefined) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Missing UnitSymbol in UnitsOfMeasure response item.'
                });
            }

            return {
                UnitSymbol: unitSymbol,
                UnitDescription: getString(item, 'UnitDescription') ?? null,
                UnitClass: getString(item, 'UnitClass') ?? null,
                DecimalPrecision: getNumber(item, 'DecimalPrecision') ?? null,
                IsBaseUnit: getBoolean(item, 'IsBaseUnit') ?? null,
                IsFixedUnitSymbolAssigned: getBoolean(item, 'IsFixedUnitSymbolAssigned') ?? null,
                SystemOfUnits: getString(item, 'SystemOfUnits') ?? null,
                IsSystemUnit: getBoolean(item, 'IsSystemUnit') ?? null,
                FixedUnitSymbolAssignment: getString(item, 'FixedUnitSymbolAssignment') ?? null,
                NationalCode: getString(item, 'NationalCode') ?? null
            };
        });

        const totalCount = typeof data['@odata.count'] === 'number' ? data['@odata.count'] : undefined;
        const hasMore = totalCount !== undefined ? skip + items.length < totalCount : items.length === limit;
        const next_cursor = hasMore ? String(skip + items.length) : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
