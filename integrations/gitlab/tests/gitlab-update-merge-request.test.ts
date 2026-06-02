import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-merge-request.js';

describe('gitlab update-merge-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-merge-request',
        Model: 'ActionOutput_gitlab_updatemergerequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
