import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { ModelResponse } from "../models.js";
import { z } from "zod";

interface TypeResponse {
    __schema: {
        types: {
            name: string;
            kind: string;
        }[];
    };
}

const IGNORE_LIST = ['Query', 'Mutation', 'Subscription', '__Schema', '__Type', '__Field', '__InputValue', '__EnumValue', '__Directive', 'PageInfo'];

const action = createAction({
    description: "Introspection endpoint to fetch the models available",
    version: "1.0.0",

    endpoint: {
        method: "GET",
        path: "/models",
        group: "Models"
    },

    input: z.void(),
    output: ModelResponse,

    exec: async (nango): Promise<ModelResponse> => {
        const query = `
            query {
              __schema {
                types {
                  name
                  kind
                }
              }
            }
        `;

        const config: ProxyConfiguration = {
            // https://studio.apollographql.com/public/Linear-API/variant/current/explorer
            endpoint: '/graphql',
            data: {
                query
            },
            retries: 3
        };

        const response = await nango.post<{ data: TypeResponse }>(config);

        const { data } = response.data;

        const models = data.__schema.types
            .filter((type) => type.kind === 'OBJECT')
            .filter((type) => !IGNORE_LIST.includes(type.name))
            .map((type) => {
                return { name: type.name };
            });

        return { models };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
