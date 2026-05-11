import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-article.js';

describe('intercom update-article tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-article',
        Model: 'ActionOutput_intercom_updatearticle'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
