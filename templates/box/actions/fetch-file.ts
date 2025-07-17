/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { Anonymous_box_action_fetchfile_output, IdEntity } from "../models.js";

const action = createAction({
    description: "Fetches the content of a file given its ID, processes the data using a response stream, and encodes it into a base64 string. This base64-encoded string can be used to recreate the file in its original format using an external tool.",
    version: "1.0.0",

    endpoint: {
        method: "GET",
        path: "/file",
        group: "Files"
    },

    input: IdEntity,
    output: Anonymous_box_action_fetchfile_output,

    exec: async (nango, input): Promise<Anonymous_box_action_fetchfile_output> => {
        if (!input || !input.id) {
            throw new Error('Missing or invalid input: a file id is required and should be a string');
        }

        const proxy: ProxyConfiguration = {
            // https://developer.box.com/reference/get-files-id-content/
            endpoint: `/2.0/files/${input.id}/content`,
            responseType: 'stream',
            retries: 3
        };
        const chunks: Buffer[] = [];
        const response = await nango.get(proxy);

        for await (const chunk of response.data) {
            chunks.push(chunk);
        }

        return Buffer.concat(chunks as unknown as Uint8Array[]).toString('base64');
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
