export type ActionInput_bitdefender_getcompanydetails = void

export interface ActionOutput_bitdefender_getcompanydetails {
  id: string;
  name: string;
  type: number;
  country?: string | undefined;
  subscribedServices: {  endpoint: boolean;
  exchange: boolean;
  network: boolean;
  sos: boolean;};
};
