import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-guild.js';

describe('discord update-guild tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-guild',
        Model: 'ActionOutput_discord_updateguild'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
