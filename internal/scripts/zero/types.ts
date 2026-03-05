import type { NangoYamlParsedIntegration } from '@nangohq/types';

export type ZeroFlow = NangoYamlParsedIntegration & { sdkVersion: string; symLinkTargetName: string | null };
