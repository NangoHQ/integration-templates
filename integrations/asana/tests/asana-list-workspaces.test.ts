import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-workspaces.js';

describe('asana list-workspaces tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-workspaces',
        Model: 'ActionOutput_asana_listworkspaces'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
