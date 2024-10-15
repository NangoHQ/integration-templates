export interface JiraUser {
    self: string;
    accountId: string;
    accountType: string;
    emailAddress?: string;
    avatarUrls: {
        '48x48': string;
        '24x24': string;
        '16x16': string;
        '32x32': string;
    };
    displayName: string;
    active: boolean;
    locale: string;
}

export interface JiraCreatedUser {
  self: string;
  accountId: string;
  accountType: string;
  emailAddress: string;
  avatarUrls: {
    '48x48': string;
    '24x24': string;
    '16x16': string;
    '32x32': string;
  };
  displayName: string;
  active: boolean;
  timeZone: string;
  locale: string;
  groups: {
    size: number;
    items: any[]; // If you have a specific structure for items, replace 'any' with the proper type
  };
  applicationRoles: {
    size: number;
    items: any[]; // Similar to groups, specify the structure of items if known
  };
  expand: string;
}

