import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-team-member.js';

describe('aircall add-team-member tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-team-member',
        Model: 'ActionOutput_aircall_basic_addteammember'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
