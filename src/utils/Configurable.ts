export interface Configurable<A = unknown> {
    configure(configurer: A): void;
}

export interface Configurables {
    configurables(): Configurable[];
}
