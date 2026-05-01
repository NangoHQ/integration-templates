import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-users-for-workspace.js';

describe('asana list-users-for-workspace tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-users-for-workspace',
        Model: 'ActionOutput_asana_listusersforworkspace'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
