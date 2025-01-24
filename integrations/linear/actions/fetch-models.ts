import type { NangoAction, ProxyConfiguration, ModelResponse } from '../../models.js';

interface TypeResponse {
    __schema: {
        types: {
            name: string;
            kind: string;
        }[];
    };
}

const IGNORE_LIST = ['Query', 'Mutation', 'Subscription', '__Schema', '__Type', '__Field', '__InputValue', '__EnumValue', '__Directive', 'PageInfo'];

export default async function runAction(nango: NangoAction): Promise<ModelResponse> {
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
        retries: 10
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
