import { vi, expect, it, describe, beforeEach } from 'vitest';

import createAction from '../actions/whoami.js';

describe('hubspot-knnj whoami tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'whoami',
        Model: 'ActionOutput_hubspot_knnj_whoami'
    });

    beforeEach(() => {
        // Mock getConnection to return credentials with access_token
        vi.spyOn(nangoMock, 'getConnection').mockResolvedValue({
            credentials: {
                access_token:
                    'CNH3xIjOMxJuQlNQMl8kQEwrAmEACAIDBAIGAQMFAwIIAQIEAwMBAQEBAgMBAQEXBAEBAQEBAQEBBgEBAQERAQEBAQENCwsBAQEBAQUBDQECAQIBAQEBAQUBAQEaAQEBAQEBAQQCAQEBAQEBAQEBAQMLAQcBBgEYptjCRiDvvq4qKNKP2AgyFMdke4gFecMIpPJNioiWFz618zlKOvABQlNQMl8kQEwrA0EBFR8NRwx0BaoBB-gBBfoBCYcCC5QCBsACBMkCFfUCBpgDE_4DF58EBd0EC-kEBO8ECPkFIKwGGOEGBosHBgsOExlYbm9_gAGGAYoBiwGQAaYBsgGzAbYBuwHBAcMBywHMAdwB3QHeAeMB5AHlAccC7QLuAvAC8QLyAsgDyQPSA94D4APhA-QD7APtA-4D8APyA_sD_AOWBJcEmQSdBKUEpwSoBPkE-gT_BIIFgwWFBYYFhwWMBacGqAapBsYGxwbJBsoGywaYB5wHogejB6QH540Ft5kFuJkFlZoFkqUFk6UFiMIFQhSItlyxtXlnm1IZJhPXrc6YGcav1EoDZXUxUgBaAGAAaO--ripwAHgA'
            }
        } as any);
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
