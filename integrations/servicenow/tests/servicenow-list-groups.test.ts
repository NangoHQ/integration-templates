import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-groups.js';

describe('servicenow list-groups tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-groups',
        Model: 'ActionOutput_servicenow_listgroups'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
