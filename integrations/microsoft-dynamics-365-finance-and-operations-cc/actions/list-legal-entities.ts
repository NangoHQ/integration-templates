import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderLegalEntitySchema = z.object({
    LegalEntityId: z.string(),
    Name: z.string().nullable().optional(),
    NameAlias: z.string().nullable().optional(),
    CompanyType: z.string().nullable().optional(),
    AddressCountryRegionId: z.string().nullable().optional()
});

const LegalEntitySchema = z.object({
    dataAreaId: z.string(),
    name: z.string().optional(),
    nameAlias: z.string().optional(),
    companyType: z.string().optional(),
    countryRegionId: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(LegalEntitySchema),
    nextCursor: z.string().optional()
});

const PAGE_SIZE = 100;

const action = createAction({
    description: 'List legal entities (companies/data areas).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(offset) || offset < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Invalid pagination cursor.'
            });
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: '/data/LegalEntities',
            params: {
                $top: PAGE_SIZE,
                $skip: offset
            },
            retries: 3
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData) || !('value' in rawData)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response format from LegalEntities endpoint.'
            });
        }

        const rawValue = rawData.value;
        if (!Array.isArray(rawValue)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response format: value is not an array.'
            });
        }

        const items = rawValue.map((item) => {
            const parsed = ProviderLegalEntitySchema.parse(item);
            return {
                dataAreaId: parsed.LegalEntityId,
                ...(parsed.Name != null && { name: parsed.Name }),
                ...(parsed.NameAlias != null && { nameAlias: parsed.NameAlias }),
                ...(parsed.CompanyType != null && { companyType: parsed.CompanyType }),
                ...(parsed.AddressCountryRegionId != null && { countryRegionId: parsed.AddressCountryRegionId })
            };
        });

        const nextCursor = rawValue.length === PAGE_SIZE ? String(offset + PAGE_SIZE) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
