import { LspComponents } from '../protocol/LspComponents';
import { CfnExternal } from './CfnExternal';
import { CfnInfraCore } from './CfnInfraCore';
import { CfnLspProviders } from './CfnLspProviders';

export type CfnInfraCoreType = Omit<CfnInfraCore, 'configurables' | 'close'>;
export type CfnExternalType = Omit<CfnExternal, 'configurables' | 'close'>;
export type CfnLspProvidersType = Omit<CfnLspProviders, 'configurables' | 'close'>;
export type ServerComponents = CfnInfraCoreType & CfnExternalType & CfnLspProvidersType;
export type CfnLspServerComponentsType = LspComponents & ServerComponents;
