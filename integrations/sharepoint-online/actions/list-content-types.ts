import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z
        .string()
        .describe('SharePoint site ID. Example: "contoso.sharepoint.com,12345678-1234-1234-1234-123456789012,12345678-1234-1234-1234-123456789012"')
});

const BaseTypeSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    group: z.string().optional()
});

const ProviderContentTypeSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    group: z.string().optional(),
    base: BaseTypeSchema.nullish()
});

const ProviderResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional()
});

const OutputSchema = z.object({
    contentTypes: z.array(
        z.object({
            id: z.string(),
            name: z.string().optional(),
            description: z.string().optional(),
            group: z.string().optional(),
            base: BaseTypeSchema.optional()
        })
    ),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List content types defined on a SharePoint site.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-content-types',
        group: 'Content Types'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const siteId = encodeURIComponent(input.siteId);
        const response = await nango.get({
            // https://learn.microsoft.com/graph/api/site-list-contenttypes
            endpoint: `/v1.0/sites/${siteId}/contentTypes`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Microsoft Graph API'
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from Microsoft Graph API'
            });
        }

        const contentTypes = parsed.data.value
            .map((item) => {
                const parseResult = ProviderContentTypeSchema.safeParse(item);
                if (!parseResult.success) {
                    return null;
                }
                const ct = parseResult.data;
                return {
                    id: ct.id,
                    name: ct.name,
                    description: ct.description,
                    group: ct.group,
                    ...(ct.base != null && { base: ct.base })
                };
            })
            .filter((ct): ct is NonNullable<typeof ct> => ct !== null);

        let nextCursor: string | undefined;
        if (parsed.data['@odata.nextLink']) {
            const url = new URL(parsed.data['@odata.nextLink']);
            nextCursor = url.searchParams.get('$skiptoken') || undefined;
        }

        return {
            contentTypes,
            ...(nextCursor != null && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
