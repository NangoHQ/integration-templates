import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/post-digital-interaction.js';

describe('gong-oauth post-digital-interaction tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'post-digital-interaction',
        Model: 'ActionOutput_gong_oauth_postdigitalinteraction'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
