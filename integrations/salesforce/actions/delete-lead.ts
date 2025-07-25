import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models.js';
import { idEntitySchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

    const config: ProxyConfiguration = {
        // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_lead.htm
        endpoint: `/services/data/v60.0/sobjects/Lead/${parsedInput.data.id}`,
        retries: 3
    };

    await nango.delete(config);

    return {
        success: true
    };
}
