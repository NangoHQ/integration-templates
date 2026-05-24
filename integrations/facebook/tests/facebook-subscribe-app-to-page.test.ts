import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/subscribe-app-to-page.js';

describe('facebook subscribe-app-to-page tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'subscribe-app-to-page',
        Model: 'ActionOutput_facebook_subscribeapptopage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
