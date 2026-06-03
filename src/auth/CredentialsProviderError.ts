export class CredentialsProviderError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CredentialsProviderError';
    }
}
