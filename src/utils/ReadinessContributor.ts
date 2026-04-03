export type ReadinessStatus = {
    readonly ready: boolean;
};

export interface ReadinessContributor {
    isReady(): ReadinessStatus;
}
