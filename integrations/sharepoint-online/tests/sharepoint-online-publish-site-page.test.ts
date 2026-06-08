import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/publish-site-page.js';

describe('sharepoint-online publish-site-page tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'publish-site-page',
        Model: 'ActionOutput_sharepoint_online_publishsitepage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
