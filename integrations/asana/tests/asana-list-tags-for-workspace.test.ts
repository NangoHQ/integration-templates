import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-tags-for-workspace.js';

describe('asana list-tags-for-workspace tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-tags-for-workspace',
        Model: 'ActionOutput_asana_listtagsforworkspace'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
