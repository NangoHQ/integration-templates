export interface SyncMetadata_clicksend_smshistory {
};

export interface Sms {
  id: string;
  to: string;
  from: string;
  body: string;
  status: 'QUEUED' | 'COMPLETED' | 'SCHEDULED' | 'WAIT_APPROVAL' | 'FAILED' | 'CANCELLED' | 'CANCELLED_AFTER_REVIEW' | 'RECEIVED' | 'SENT' | 'SUCCESS';
  createdAt: string;
  updatedAt: string;
};

export type ActionInput_clicksend_fetchaccount = void

export interface ActionOutput_clicksend_fetchaccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  balance: string;
  country: string;
  timezone: string;
  accountName: string;
  accountBillingEmail: string;
};

export interface ActionInput_clicksend_sendsms {
  to: string;
  body: string;
};

export interface ActionOutput_clicksend_sendsms {
  id: string;
  to: string;
  from: string;
  body: string;
  status: 'QUEUED' | 'COMPLETED' | 'SCHEDULED' | 'WAIT_APPROVAL' | 'FAILED' | 'CANCELLED' | 'CANCELLED_AFTER_REVIEW' | 'RECEIVED' | 'SENT' | 'SUCCESS';
  createdAt: string;
  updatedAt: string;
};
