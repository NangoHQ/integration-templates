import { createAction } from 'nango';
import { InstantlySetCampaignNameResponse, InstantlySetCampaignNameInput } from '../models.js';

const action = createAction({
    description: 'Action to set a campaign name',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/instantly/set-campaign-name'
    },

    input: InstantlySetCampaignNameInput,
    output: InstantlySetCampaignNameResponse,

    exec: async (nango, input): Promise<InstantlySetCampaignNameResponse> => {
        if (!input.campaign_id) {
            throw new nango.ActionError({
                message: 'campaign_id is a required field'
            });
        } else if (!input.name) {
            throw new nango.ActionError({
                message: 'name is a required field'
            });
        }

        const connection = await nango.getConnection();

        let api_key: string;
        if ('apiKey' in connection.credentials) {
            api_key = connection.credentials.apiKey;
        } else {
            throw new nango.ActionError({
                message: `API key credentials is incomplete`
            });
        }

        const postData = {
            api_key: api_key,
            campaign_id: input.campaign_id,
            name: input.name
        };

        const resp = await nango.post({
            endpoint: `/v1/campaign/set/name`,
            data: postData,
            retries: 3
        });

        const { status } = resp.data;

        return { status };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
