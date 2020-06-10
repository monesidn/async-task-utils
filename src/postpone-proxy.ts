import { TaskQueue } from "./task-queue";

export interface ProxyCfg {
    flushMethod?: string;
    clearMethod?: string;
    getProxyMethod?: string;
    intercept?: string[];
}

export interface DefaultPostponedObject<T> {
    flush(): Promise<void>;
    clear(): void;
    getProxy(): PostponeProxy<T>;
}

const defaultCfg = {
    flushMethod: 'flush',
    clearMethod: 'clear',
    getProxyMethod: 'getProxy',
    intercept: []
}

export class PostponeProxy<T, P = DefaultPostponedObject<T>> {
    private taskQueue = new TaskQueue();
    private interceptedMethods?: Set<string>;
    private readonly cfg: Required<ProxyCfg>;

    public readonly proxy: T & P;

    constructor(private _target: any, userCfg?: ProxyCfg){
        this.cfg = Object.assign({}, defaultCfg, userCfg || {});
        if (this.cfg.intercept.length > 0){
            this.interceptedMethods = new Set<string>();
            for (const i of this.interceptedMethods){
                this.interceptedMethods.add(i);
            }
        }

        const flusher = () => this.taskQueue.runPending();
        const cleaner = () => this.taskQueue.cancelPending();
        const getProxy = () => this;

        this.proxy = new Proxy(_target, {
            get: (target: any, name: string) => {
                switch (name){
                    case this.cfg.flushMethod:
                        return flusher;
                    case this.cfg.clearMethod:
                        return cleaner;
                    case this.cfg.getProxyMethod:
                        return getProxy;
                    default: 
                        if ((!this.interceptedMethods || this.interceptedMethods.has(name)) && typeof target[name] === 'function'){
                            // Returns a function that actually postpone the real invocation
                            return this.interceptor(name);
                        }
                        return target[name];
                }
            }
        });
    }

    private interceptor(member: string){
        return (...params: any[]) => {
            return this.taskQueue.add(() => {
                return this._target[member](...params);
            });
        }
    }
}

export function postponeProxy<T, P = DefaultPostponedObject<T>>(target: T, cfg?: ProxyCfg): T & P {
    const obj = new PostponeProxy<T,P>(target, cfg);
    return obj.proxy;
}