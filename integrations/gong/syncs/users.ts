import type { NangoSync, ProxyConfiguration, User } from '../../models.js';
import type { GongUser, AxiosError, GongError } from '../types.js';

const BATCH_SIZE = 100;

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://gong.app.gong.io/settings/api/documentation#post-/v2/users/extensive
        endpoint: `/v2/users/extensive`,
        data: {
            filter: {
                ...(nango.lastSyncDate && {
                    createdFromDateTime: nango.lastSyncDate.toISOString()
                })
            }
        },
        paginate: {
            type: 'cursor',
            cursor_name_in_request: 'cursor',
            cursor_path_in_response: 'records.cursor',
            in_body: true,
            response_path: 'users'
        },
        method: 'post',
        retries: 10
    };

    // @allowTryCatch
    try {
        for await (const usersBatch of nango.paginate<GongUser>(config)) {
            // Process users in batches
            for (let i = 0; i < usersBatch.length; i += BATCH_SIZE) {
                const currentBatch = usersBatch.slice(i, i + BATCH_SIZE);
                await nango.log(`Processing batch of ${currentBatch.length} calls...`);
                const mappedUsers: User[] = currentBatch.map((user) => ({
                    id: String(user.id),
                    email: user.emailAddress,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    title: user.title
                }));

                if (mappedUsers.length > 0) {
                    await nango.batchSave<User>(mappedUsers, 'User');
                }
            }
        }
    } catch (error: any) {
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
        const errors = (error as AxiosError<GongError>).response?.data?.errors ?? [];
        const emptyResult = errors.includes('No users found corresponding to the provided filters');

        if (emptyResult) {
            await nango.log('No users found corresponding to the provided filters');
        } else {
            throw error;
        }
    }
}
