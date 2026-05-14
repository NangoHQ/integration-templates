import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-reaction.js';

describe('discord create-reaction tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-reaction',
        Model: 'ActionOutput_discord_createreaction'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
