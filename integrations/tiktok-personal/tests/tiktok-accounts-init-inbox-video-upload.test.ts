import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/init-inbox-video-upload.js';

describe('tiktok-accounts init-inbox-video-upload tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'init-inbox-video-upload',
        Model: 'ActionOutput_tiktok_accounts_initinboxvideoupload'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
