import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-forum-category.js';

describe('freshdesk delete-forum-category tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-forum-category',
        Model: 'ActionOutput_freshdesk_deleteforumcategory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
