import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-group-member.js';

describe('microsoft add-group-member tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-group-member',
        Model: 'ActionOutput_microsoft_addgroupmember'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
