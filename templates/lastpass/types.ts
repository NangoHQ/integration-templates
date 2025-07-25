export interface LastPassBody {
    cid: number;
    provhash: string;
    cmd: string;
    data: object | object[];
}

export interface LastPassCreateNewUser {
    username: string;
    fullname: string;
    groups?: string[];
    duousername?: string;
    securidusername?: string;
    password?: string;
    password_reset_required?: boolean;
}

export interface LastPassResponse {
    status: string;
    error?: string[];
}

export interface ReturnedUser {
    username: string;
    fullname: string;
    mpstrength: string;
    created: string;
    last_pw_change: string;
    last_login: string;
    neverloggedin: boolean;
    disabled: boolean;
    admin: boolean;
    totalscore: number | null;
    legacytotalscore: number | null;
    hasSharingKeys: boolean;
    duousername: string | null;
    sites: string | null;
    notes: string | null;
    formfills: string | null;
    applications: string | null;
    attachments: string | null;
    password_reset_required: boolean;
}

type Users = Record<string, ReturnedUser>;

export interface Response {
    total: number;
    count: number;
    Users: Users;
    Groups: any;
    invited?: string[];
}
