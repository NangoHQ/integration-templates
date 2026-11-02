import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-watch-history.js';

describe('google-mail list-watch-history tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-watch-history',
        Model: 'ActionOutput_google_mail_listwatchhistory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('sends each historyTypes value as its own query param', async () => {
        // @ts-expect-error - stubbing one response to inspect the request
        nangoMock.get.mockResolvedValueOnce({ data: {} });

        await createAction.exec(nangoMock, { startHistoryId: '123', historyTypes: ['messageAdded', 'labelAdded'] });

        expect(nangoMock.get).toHaveBeenLastCalledWith(
            expect.objectContaining({ params: 'startHistoryId=123&historyTypes=messageAdded&historyTypes=labelAdded' })
        );
    });
});
