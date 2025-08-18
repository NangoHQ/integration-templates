import type { NangoYamlParsedIntegration } from '@nangohq/types';

export type ZeroFlow = NangoYamlParsedIntegration & { jsonSchema: any; sdkVersion: string; isSymLink: boolean };
