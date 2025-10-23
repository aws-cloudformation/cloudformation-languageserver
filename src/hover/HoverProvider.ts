import { Position } from 'vscode-languageserver-protocol';
import { Context } from '../context/Context';

export interface HoverProvider {
    getInformation(context: Context, position?: Position): string | undefined;
}
