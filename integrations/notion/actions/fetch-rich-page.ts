import type { NangoAction, RichPage, RichPageInput } from '../../models';
import { richPageInputSchema } from '../schema.zod.js';
import { mapPage } from '../mappers/to-page.js';

export default async function runAction(nango: NangoAction, input: RichPageInput): Promise<RichPage> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: richPageInputSchema, input });

    const response = await nango.get({
        endpoint: `/v1/pages/${parsedInput.data.pageId}`,
        retries: 3
    });

    const page = response.data;

    const mappedPage = await mapPage(nango, page);

    return mappedPage;
}
