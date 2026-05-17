import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-reaction.js';

describe('discord delete-reaction tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-reaction',
        Model: 'ActionOutput_discord_deletereaction'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
