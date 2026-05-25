import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-user-pages.js';

describe('facebook list-user-pages tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-user-pages',
        Model: 'ActionOutput_facebook_listuserpages'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
