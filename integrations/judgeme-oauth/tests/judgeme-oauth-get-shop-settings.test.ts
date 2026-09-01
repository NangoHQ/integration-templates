import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-shop-settings.js';

describe('judgeme-oauth get-shop-settings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-shop-settings',
        Model: 'ActionOutput_judgeme_oauth_getshopsettings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
