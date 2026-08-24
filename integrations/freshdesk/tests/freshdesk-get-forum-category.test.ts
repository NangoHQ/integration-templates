import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-forum-category.js';

describe('freshdesk get-forum-category tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-forum-category',
        Model: 'ActionOutput_freshdesk_getforumcategory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
