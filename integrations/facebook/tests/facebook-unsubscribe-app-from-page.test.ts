import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unsubscribe-app-from-page.js';

describe('facebook unsubscribe-app-from-page tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unsubscribe-app-from-page',
        Model: 'ActionOutput_facebook_unsubscribeappfrompage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
