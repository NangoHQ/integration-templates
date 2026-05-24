import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-group-members.js';

describe('microsoft list-group-members tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-group-members',
        Model: 'ActionOutput_microsoft_listgroupmembers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
