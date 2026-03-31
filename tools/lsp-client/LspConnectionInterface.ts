export interface LspConnection {
    initialize(): Promise<void>;
    sendRequest(method: string, params: any): Promise<any>;
    sendNotification(method: string, params: any): Promise<void>;
    onNotification(method: string, handler: (params: any) => void): void;
    onRequest(method: string, handler: (params: any) => any): void;
    shutdown(): Promise<void>;
    getSystemStatus(): Promise<any>;
}
