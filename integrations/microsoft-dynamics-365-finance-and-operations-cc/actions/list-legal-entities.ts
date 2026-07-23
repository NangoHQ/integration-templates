import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderLegalEntitySchema = z
    .object({
        LegalEntityId: z.string(),
        Name: z.string().nullish()
    })
    .passthrough();

const ODataListResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderLegalEntitySchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List legal entities (companies/data areas).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (input.cursor !== undefined && isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Cursor must be a numeric string.'
            });
        }
        const top = 100;

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/LegalEntities',
            params: {
                $top: String(top),
                $skip: String(skip),
                $count: 'true'
            },
            retries: 3
        });

        const parsedResponse = ODataListResponseSchema.parse(response.data);
        const items = parsedResponse.value.map((entity) => {
            const parsed = ProviderLegalEntitySchema.safeParse(entity);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Legal entity failed schema validation.'
                });
            }

            return parsed.data;
        });

        let nextCursor: string | undefined;
        if (parsedResponse['@odata.nextLink'] != null) {
            // Server explicitly says there's more — trust it, and try to extract the real $skip it wants us to use next.
            const nextUrl = new URL(parsedResponse['@odata.nextLink']);
            const skipParam = nextUrl.searchParams.get('$skip');
            nextCursor = skipParam ?? String(skip + items.length);
        } else if (items.length === top) {
            // No explicit nextLink, but we got a full page — assume there may be more.
            nextCursor = String(skip + top);
        }

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
