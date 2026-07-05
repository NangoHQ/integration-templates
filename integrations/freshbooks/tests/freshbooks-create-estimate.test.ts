import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-estimate.js';

describe('freshbooks create-estimate tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-estimate',
        Model: 'ActionOutput_freshbooks_createestimate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
