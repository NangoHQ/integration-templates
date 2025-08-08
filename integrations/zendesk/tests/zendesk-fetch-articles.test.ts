import { vi, expect, it, describe } from 'vitest';

import runAction from '../actions/fetch-articles.js';

describe('zendesk fetch-articles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'fetch-articles',
        Model: 'ArticleResponse'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await runAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
