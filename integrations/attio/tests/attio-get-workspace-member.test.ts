import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-workspace-member.js';

describe('attio get-workspace-member tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-workspace-member',
        Model: 'ActionOutput_attio_getworkspacemember'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
