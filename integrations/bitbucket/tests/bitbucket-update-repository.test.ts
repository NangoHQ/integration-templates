import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-repository.js';

describe('bitbucket update-repository tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-repository',
        Model: 'ActionOutput_bitbucket_updaterepository'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
