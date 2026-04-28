import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-users-for-team.js';

describe('asana list-users-for-team tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-users-for-team',
        Model: 'ActionOutput_asana_listusersforteam'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
