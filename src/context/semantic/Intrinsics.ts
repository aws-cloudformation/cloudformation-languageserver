import { IntrinsicFunction } from '../ContextType';

export function normalizeIntrinsicFunction(text: string): string {
    if (text.startsWith('!')) {
        const shortForm = text.slice(1);
        return shortForm === 'Ref' ? 'Ref' : `Fn::${shortForm}`;
    }

    if (text.startsWith('Fn::ForEach::')) {
        return String(IntrinsicFunction.ForEach);
    }
    return text;
}
