import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-repository.js';

describe('bitbucket create-repository tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-repository',
        Model: 'ActionOutput_bitbucket_createrepository'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
