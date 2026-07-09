import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-trending-editorial-articles.js';

describe('pinterest get-trending-editorial-articles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-trending-editorial-articles',
        Model: 'ActionOutput_pinterest_gettrendingeditorialarticles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
