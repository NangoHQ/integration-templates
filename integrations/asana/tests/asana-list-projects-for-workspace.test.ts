import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-projects-for-workspace.js';

describe('asana list-projects-for-workspace tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-projects-for-workspace',
        Model: 'ActionOutput_asana_listprojectsforworkspace'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
