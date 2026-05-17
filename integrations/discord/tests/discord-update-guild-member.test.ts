import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-guild-member.js';

describe('discord update-guild-member tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-guild-member',
        Model: 'ActionOutput_discord_updateguildmember'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
