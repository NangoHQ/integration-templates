import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-merge-requests.js';

describe('gitlab list-merge-requests tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-merge-requests',
        Model: 'ActionOutput_gitlab_listmergerequests'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
