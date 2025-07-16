import { createAction } from "nango";
import { GithubWriteFileActionResult, GithubWriteFileInput } from "../models.js";

const action = createAction({
    description: "Write content to a particular github file within a repo. If\nthe file doesn't exist it creates and then writes to it",
    version: "1.0.1",

    endpoint: {
        method: "PUT",
        path: "/files",
        group: "Files"
    },

    input: GithubWriteFileInput,
    output: GithubWriteFileActionResult,
    scopes: ["repo"],

    exec: async (nango, input): Promise<GithubWriteFileActionResult> => {
        const endpoint = `/repos/${input.owner}/${input.repo}/contents/${input.path}`;

        let fileSha: string | undefined = undefined;

        // @allowTryCatch
        try {
            const file = await nango.get({
                endpoint: endpoint,
                retries: 3
            });

            fileSha = file && file.data && file.data.sha ? file.data.sha : undefined;
        } catch {
            // File does not exist
        }

        await nango.log(fileSha ? 'File exists, updating.' : 'File does not exist, creating new file.');

        const resp = await nango.proxy({
            method: 'PUT',
            endpoint: endpoint,
            data: {
                message: input.message,
                content: Buffer.from(input.content).toString('base64'),
                sha: fileSha
            },
            retries: 3
        });

        return {
            url: resp.data.content.html_url,
            status: resp.status == 200 || resp.status == 201 ? 'success' : 'failure',
            sha: resp.data.content.sha
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
