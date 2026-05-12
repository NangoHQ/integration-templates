import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-article.js';

describe('intercom create-article tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-article',
        Model: 'ActionOutput_intercom_createarticle'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
