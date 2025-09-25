export function normalizeIntrinsicFunction(text: string): string {
    if (text.startsWith('!')) {
        const shortForm = text.slice(1);
        return shortForm === 'Ref' ? 'Ref' : `Fn::${shortForm}`;
    }
    return text;
}
