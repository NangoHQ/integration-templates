import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-role.js';

describe('discord get-role tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-role',
        Model: 'ActionOutput_discord_getrole'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
