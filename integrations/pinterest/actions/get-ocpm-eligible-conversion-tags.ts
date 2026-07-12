import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"')
});

const ConversionEventSchema = z.object({
    ad_account_id: z.string().describe('Id of the ad account. Example: "549757463328"'),
    conversion_event: z.string().describe('Type of conversion event. Example: "PAGE_LOAD"'),
    conversion_tag_id: z.string().describe('Id of the tag. Example: "2614324385652"'),
    created_time: z.number().describe('Creation date in epoch format. Example: 1564768710'),
    reporting_conversion_event: z.string().optional().describe('For advertiser-defined events, the reporting event label shown in optimization UIs.')
});

const OutputSchema = z.object({
    items: z.array(ConversionEventSchema)
});

const action = createAction({
    description: 'List conversion tags eligible for oCPM bidding.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/ocpm_eligible_conversion_tags/get
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/conversion_tags/ocpm_eligible`,
            retries: 3
        });

        const ProviderResponseSchema = z.record(z.string(), z.array(z.unknown()));
        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Pinterest API.'
            });
        }

        const items: z.infer<typeof ConversionEventSchema>[] = [];
        for (const [, events] of Object.entries(parsedResponse.data)) {
            for (const event of events) {
                const parsed = ConversionEventSchema.safeParse(event);
                if (parsed.success) {
                    items.push(parsed.data);
                }
            }
        }

        return { items };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
