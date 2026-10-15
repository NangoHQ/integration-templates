import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-workspace-templates.js';

describe('mural list-workspace-templates tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-workspace-templates',
        Model: 'ActionOutput_mural_listworkspacetemplates'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
