import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-reviews.js';

describe('judgeme-oauth list-reviews tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-reviews',
        Model: 'ActionOutput_judgeme_oauth_listreviews'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
