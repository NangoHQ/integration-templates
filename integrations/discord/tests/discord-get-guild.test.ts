import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-guild.js';

describe('discord get-guild tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-guild',
        Model: 'ActionOutput_discord_getguild'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
