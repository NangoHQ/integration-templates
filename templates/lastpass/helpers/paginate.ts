import type { NangoSync, ProxyConfiguration } from "nango";

export interface LastPassPaginationParams {
    endpoint: string;
    cid: number;
    provhash: string;
    cmd: string;
    pageSize?: number;
}

export interface LastPassPaginationResponse<T> {
    results: T[];
}

export async function* paginate<T>(
    nango: NangoSync,
    { endpoint, cid, provhash, cmd, pageSize = 100 }: LastPassPaginationParams
): AsyncGenerator<LastPassPaginationResponse<T>, void, undefined> {
    let pageIndex = 0;

    while (true) {
        const body = {
            cid,
            provhash,
            cmd,
            data: {
                pagesize: pageSize,
                pageindex: pageIndex
            }
        };

        const config: ProxyConfiguration = {
            // eslint-disable-next-line @nangohq/custom-integrations-linting/include-docs-for-endpoints
            endpoint,
            retries: 10,
            data: body
        };
        const response = await nango.post<{
            total: number;
            count: number;
            Users: Record<string, any>;
            invited: string[];
        }>(config);

        const users = Object.values(response.data.Users ?? {}).map((user) => ({
            username: user.username,
            fullname: user.fullname,
            mpstrength: user.mpstrength,
            created: user.created,
            last_pw_change: user.last_pw_change,
            last_login: user.last_login,
            neverloggedin: user.neverloggedin,
            disabled: user.disabled,
            admin: user.admin,
            totalscore: user.totalscore,
            legacytotalscore: user.legacytotalscore,
            hasSharingKeys: user.hasSharingKeys,
            duousername: user.duousername,
            sites: user.sites,
            notes: user.notes,
            formfills: user.formfills,
            applications: user.applications,
            attachments: user.attachments,
            password_reset_required: user.password_reset_required
        }));

        if (users.length === 0 || users.length < pageSize) {
            // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
            yield { results: users as T[] };
            break;
        }
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
        yield { results: users as T[] };

        pageIndex += 1;
    }
}
