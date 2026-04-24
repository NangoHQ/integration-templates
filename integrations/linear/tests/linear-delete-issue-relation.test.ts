import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-issue-relation.js';

describe('linear delete-issue-relation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-issue-relation',
        Model: 'ActionOutput_linear_deleteissuerelation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
