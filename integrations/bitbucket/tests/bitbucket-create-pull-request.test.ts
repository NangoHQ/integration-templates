import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-pull-request.js';

describe('bitbucket create-pull-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-pull-request',
        Model: 'ActionOutput_bitbucket_createpullrequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
