import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-site-page.js';

describe('sharepoint-online create-site-page tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-site-page',
        Model: 'ActionOutput_sharepoint_online_createsitepage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
