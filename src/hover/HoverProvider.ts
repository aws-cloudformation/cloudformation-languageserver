import { Context } from '../context/Context';

export interface HoverProvider {
    getInformation(context: Context): string | undefined;
}
