import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-workspace-members.js';

describe('attio list-workspace-members tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-workspace-members',
        Model: 'ActionOutput_attio_listworkspacemembers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
