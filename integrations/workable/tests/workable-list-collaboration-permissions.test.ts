import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-collaboration-permissions.js';

describe('workable list-collaboration-permissions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-collaboration-permissions',
        Model: 'ActionOutput_workable_listcollaborationpermissions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
