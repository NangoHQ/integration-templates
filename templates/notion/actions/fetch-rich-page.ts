import { createAction } from "nango";
import { richPageInputSchema } from '../schema.zod.js';
import { mapPage } from '../mappers/to-page.js';

import { RichPage, RichPageInput } from "../models.js";

const action = createAction({
    description: "Fetch a specific page in Notion by passing a pageId. This action fetches a page,\nand its content and converts it into a full markdown. It transforms images,\ntables, uploaded files, etc., into their markdown counterparts, providing a complete markdown.",
    version: "1.0.1",

    endpoint: {
        method: "GET",
        path: "/pages/single",
        group: "Pages"
    },

    input: RichPageInput,
    output: RichPage,

    exec: async (nango, input): Promise<RichPage> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: richPageInputSchema, input });

        const response = await nango.get({
            endpoint: `/v1/pages/${parsedInput.data.pageId}`,
            retries: 3
        });

        const page = response.data;

        const mappedPage = await mapPage(nango, page);

        return mappedPage;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
