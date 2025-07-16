import { createAction } from "nango";
import type { DropboxTemporaryDownloadLink } from '../types.js';

import type { ProxyConfiguration } from "nango";

import {
    Anonymous_dropbox_action_fetchfile_output,
    Anonymous_dropbox_action_fetchfile_input,
} from "../models.js";

const action = createAction({
    description: "Fetches the content of a file given its ID, processes the data using a response stream, and encodes it into a base64 string. This base64-encoded string can be used to recreate the file in its original format using an external tool.",
    version: "1.0.0",

    endpoint: {
        method: "GET",
        path: "/fetch-file"
    },

    input: Anonymous_dropbox_action_fetchfile_input,
    output: Anonymous_dropbox_action_fetchfile_output,
    scopes: ["files.content.read"],

    exec: async (nango, input): Promise<Anonymous_dropbox_action_fetchfile_output> => {
        if (!input || typeof input !== 'string') {
            throw new Error('Missing or invalid input: a file ID is required and should be a string');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.dropbox.com/developers/documentation/http/documentation#files-get_temporary_link
            endpoint: `/2/files/get_temporary_link`,
            data: {
                path: input
            },
            retries: 3
        };

        const { data } = await nango.post<DropboxTemporaryDownloadLink>(proxyConfig);

        if (!data.metadata.is_downloadable) {
            throw new nango.ActionError({
                message: 'File is not downloadable',
                data: data.metadata
            });
        }

        const config: ProxyConfiguration = {
            // https://www.dropbox.com/developers/documentation/http/documentation#files-get_temporary_link
            endpoint: data.link,
            responseType: 'arraybuffer',
            retries: 3
        };

        const response = await nango.get(config);

        const chunks: Buffer[] = [];
        for await (const chunk of response.data) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        return buffer.toString('base64');
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
