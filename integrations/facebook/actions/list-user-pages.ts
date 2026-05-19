import { z } from 'zod';
import { createAction } from 'nango';

// Provider schema for raw Facebook Page response
const ProviderPageSchema = z.object({
    id: z.string(),
    name: z.string(),
    category: z.string().optional(),
    category_list: z
        .array(
            z.object({
                id: z.string(),
                name: z.string()
            })
        )
        .optional(),
    access_token: z.string().optional(),
    fan_count: z.number().optional(),
    picture: z
        .object({
            data: z.object({
                url: z.string().optional()
            })
        })
        .optional()
});

// Provider response schema for the accounts edge
const ProviderAccountsResponseSchema = z.object({
    data: z.array(ProviderPageSchema),
    paging: z
        .object({
            cursors: z
                .object({
                    before: z.string().optional(),
                    after: z.string().optional()
                })
                .optional(),
            next: z.string().optional()
        })
        .optional()
});

const PageSchema = z.object({
    id: z.string().describe('Page ID. Example: "123456789"'),
    name: z.string().describe('Page name. Example: "My Business Page"'),
    category: z.string().optional().describe('Page category. Example: "Retail Company"'),
    categoryList: z
        .array(
            z.object({
                id: z.string(),
                name: z.string()
            })
        )
        .optional()
        .describe('Detailed category list'),
    accessToken: z.string().optional().describe('Page access token for API calls'),
    fanCount: z.number().optional().describe('Number of fans/likes'),
    pictureUrl: z.string().optional().describe('Page profile picture URL')
});

const OutputSchema = z.object({
    pages: z.array(PageSchema).describe('List of Facebook Pages accessible to the user')
});

const action = createAction({
    description: 'List Facebook Pages the authenticated user can access',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-user-pages',
        group: 'Pages'
    },
    input: z.object({}),
    output: OutputSchema,
    scopes: ['pages_show_list'],

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.facebook.com/docs/graph-api/reference/user/accounts/
        const response = await nango.get({
            endpoint: '/me/accounts',
            params: {
                fields: 'id,name,category,category_list,access_token,fan_count,picture'
            },
            retries: 3
        });

        const rawResponse = ProviderAccountsResponseSchema.parse(response.data);

        const pages = rawResponse.data.map((page) => ({
            id: page.id,
            name: page.name,
            ...(page.category !== undefined && { category: page.category }),
            ...(page.category_list !== undefined && { categoryList: page.category_list }),
            ...(page.access_token !== undefined && { accessToken: page.access_token }),
            ...(page.fan_count !== undefined && { fanCount: page.fan_count }),
            ...(page.picture?.data?.url !== undefined && { pictureUrl: page.picture.data.url })
        }));

        return {
            pages
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
