import type {
    NangoSync,
    ProxyConfiguration
    // User
} from '../../models';

// TODO: docs
export default async function fetchData(nango: NangoSync): Promise<void> {
    // let totalRecords = 0;

    const proxyConfiguration: ProxyConfiguration = {
        endpoint: '/api/v2/contacts.json', // TODO: verify if we need to filter out deleted
        retries: 10
        // params: {
        //     page: 1
        // },
        // paginate: {
        //     type: 'link',
        //     limit_name_in_request: 'page',
        //     link_rel_in_response_header: 'page',
        //     limit: 100
        // }
    };

    const response = await nango.get<any>(proxyConfiguration);
    console.log('response', response.data);

    // for await (const freshdeskUsers of nango.paginate(proxyConfiguration)) {
    //     console.log('freshdeskUsers', freshdeskUsers);

    //     const batchSize: number = freshdeskUsers.length || 0;
    //     totalRecords += batchSize;

    //     const users: User[] = freshdeskUsers.map(mapUser) || [];

    //     await nango.log(`Saving batch of ${batchSize} users (total users: ${totalRecords})`);

    //     await nango.batchSave(users, 'User');
    // }
}

// // TODO: docs
// function mapUser(user: any): User {
//     return {
//         id: user.userId,
//         email: user.email,
//         firstName: user.firstName,
//         lastName: user.lastName
//     };
// }
