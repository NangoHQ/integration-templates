import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-watchers.js';

describe('bitbucket list-watchers tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-watchers',
        Model: 'ActionOutput_bitbucket_listwatchers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
