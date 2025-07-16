import { createAction } from "nango";
import type { ListDrivesInput } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { DriveListResponse, ListDrivesInput } from "../models.js";

/**
 * Lists all shared drives the user has access to.
 *
 * API Documentation: https://developers.google.com/drive/api/reference/rest/v3/drives/list
 *
 * @param nango - The Nango action context
 * @param input - Optional input containing cursor for pagination
 * @returns A promise that resolves to a DriveListResponse containing an array of drives and optional cursor
 */
const action = createAction({
    description: "Lists all shared drives the user has access to. Returns paginated results with up to 100 drives per page.",
    version: "1.0.0",

    endpoint: {
        method: "GET",
        path: "/drives",
        group: "Drives"
    },

    input: ListDrivesInput,
    output: DriveListResponse,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],

    exec: async (nango, input): Promise<DriveListResponse> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/drive/api/reference/rest/v3/drives/list
            endpoint: 'drive/v3/drives',
            params: {
                fields: 'nextPageToken, kind, drives(id, name, kind, createdTime, hidden, capabilities/*, restrictions/*)',
                pageSize: '100',
                useDomainAdminAccess: 'false',
                ...(input?.cursor && { pageToken: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get<{ drives: DriveListResponse['drives']; nextPageToken?: string; kind: string }>(config);

        return {
            drives: response.data.drives || [],
            next_cursor: response.data.nextPageToken,
            kind: response.data.kind
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
