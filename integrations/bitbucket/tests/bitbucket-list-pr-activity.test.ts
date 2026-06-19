import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-pr-activity.js';

describe('bitbucket list-pr-activity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-pr-activity',
        Model: 'ActionOutput_bitbucket_listpractivity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
