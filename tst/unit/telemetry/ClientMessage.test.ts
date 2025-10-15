import { StubbedInstance } from 'ts-sinon';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MessageType, ShowMessageRequestParams } from 'vscode-languageserver';
import { LspCommunication } from '../../../src/protocol/LspCommunication';
import { ClientMessage } from '../../../src/telemetry/ClientMessage';
import { createMockLspCommunication } from '../../utils/MockServerComponents';

describe('ClientMessage', () => {
    let mockCommunication: StubbedInstance<LspCommunication>;
    let clientMessage: ClientMessage;

    beforeEach(() => {
        mockCommunication = createMockLspCommunication();
        clientMessage = new ClientMessage(mockCommunication);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('message notifications', () => {
        it('should send message notifications', async () => {
            mockCommunication.showMessage.returns(Promise.resolve());

            await clientMessage.showMessageNotification(MessageType.Info, 'test notification');

            expect(
                mockCommunication.showMessage.calledWith({
                    type: MessageType.Info,
                    message: 'test notification',
                }),
            ).toBe(true);
        });

        it('should send message requests', async () => {
            const params: ShowMessageRequestParams = {
                type: MessageType.Warning,
                message: 'test request',
            };

            await clientMessage.showMessageRequest(params);

            expect(mockCommunication.showMessageRequest.calledWith(params)).toBe(true);
        });

        it('should send log message notifications', async () => {
            await clientMessage.logMessageNotification(MessageType.Error, 'test log notification');

            expect(
                mockCommunication.logMessage.calledWith({
                    type: MessageType.Error,
                    message: 'test log notification',
                }),
            ).toBe(true);
        });
    });
});
