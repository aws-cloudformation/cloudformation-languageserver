export class CredentialsProviderError extends Error {
    constructor(message: string = 'IAM credentials not configured') {
        super(message);
        this.name = 'CredentialsProviderError';
        Object.setPrototypeOf(this, CredentialsProviderError.prototype);
    }
}
