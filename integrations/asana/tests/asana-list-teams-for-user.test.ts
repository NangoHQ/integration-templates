import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-teams-for-user.js';

describe('asana list-teams-for-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-teams-for-user',
        Model: 'ActionOutput_asana_listteamsforuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
