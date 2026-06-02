import { z } from 'zod';
import { createAction } from 'nango';

const FilteringSchema = z.object({
    action: z.string().optional(),
    data_dimension: z.string().optional(),
    rule_info: z.array(z.string()).optional(),
    status: z.string().optional(),
    time: z.array(z.string()).optional()
});

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    filtering: FilteringSchema.optional(),
    page: z.number().optional().describe('Page number. Default: 1'),
    page_size: z.number().optional().describe('Page size. Default: 10'),
    tzone: z.string().optional().describe('Timezone. Default: UTC')
});

const PageInfoSchema = z.object({
    page: z.number().optional(),
    page_size: z.number().optional(),
    total_number: z.number().optional(),
    total_page: z.number().optional()
});

const RuleSchema = z
    .object({
        rule_id: z.string().optional(),
        name: z.string().optional(),
        status: z.string().optional(),
        action: z.string().optional(),
        data_dimension: z.string().optional(),
        tzone: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(RuleSchema),
    page_info: PageInfoSchema.optional()
});

const action = createAction({
    description: 'List automated rules for an advertiser in TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-automated-rules',
        group: 'Automated Rules'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ad_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: { [key: string]: string | number } = {
            advertiser_id: input.advertiser_id
        };

        if (input.filtering !== undefined) {
            params['filtering'] = JSON.stringify(input.filtering);
        }
        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.page_size !== undefined) {
            params['page_size'] = input.page_size;
        }
        if (input.tzone !== undefined) {
            params['tzone'] = input.tzone;
        }

        const response = await nango.get({
            // https://business-api.tiktok.com/portal/docs?id=1738768861976578
            endpoint: 'optimizer/rule/list/',
            params,
            retries: 3
        });

        const envelope = z
            .object({
                code: z.number(),
                message: z.string().optional(),
                request_id: z.string().optional(),
                data: z.unknown().optional()
            })
            .parse(response.data);

        if (envelope.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: envelope.message || 'TikTok API returned an error',
                code: envelope.code
            });
        }

        const providerData = z
            .object({
                list: z.array(z.unknown()).optional(),
                page_info: z.unknown().optional()
            })
            .parse(envelope.data ?? {});

        const rawItems = providerData.list ?? [];
        const items = rawItems.map((item: unknown) => RuleSchema.parse(item));

        const pageInfo = PageInfoSchema.safeParse(providerData.page_info);

        return {
            items,
            ...(pageInfo.success && providerData.page_info !== undefined && { page_info: pageInfo.data })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
