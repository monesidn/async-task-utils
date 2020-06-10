import { EventEmitter } from 'eventemitter3';

export interface PendingTask{
    action: () => Promise<any>;
    
    promise: Promise<any>;
    resolve: (result: any) => void;
    reject: (error: any) => void;
}

/**
 * When calling `TaskQueue.runPending()` this enum defines how task can be run.
 */
export enum PendingRunMode{
    /**
     * All task are runned concurrently. No error check is performed.
     */
    CONCURRENT="CONCURRENT",

    /**
     * We wait for each task to complete before starting the next. No error check is performed.
     */
    SERIALIZED="SERIALIZED",

    /**
     * We wait for each task to complete before starting the next. If a task fails (the promise
     * is rejected) we stop processing leaving pending tasks in the queue.
     */
    SERIALIZED_UNTIL_ERROR="SERIALIZED_UNTIL_ERROR"
}

/**
 * Whenever task is canceled the related promise
 * is rejected with this error. Remember to handle (or maybe ignore) this kind of errors.
 */
export class TaskCanceledError extends Error{
    constructor(){
        super("Pending task canceled");
    }
}

export class TaskQueue extends EventEmitter{

    queue: PendingTask[] = [];

    add<T>(action: () => Promise<T>): Promise<T>{
        const descriptor: Partial<PendingTask> = {};
        const promise = new Promise<T>((resolve, reject) => {
            descriptor.reject = reject;
            descriptor.resolve = resolve;
        });
        descriptor.action = action;
        descriptor.promise = promise;
        this.queue.push(descriptor as PendingTask);

        this.emit('task-added', promise);
        return promise;
    }

    /**
     * Run a single task.
     * @param task 
     * @return The task Promise. The same returned from "Add".
     */
    run(task: PendingTask){
        this.emit('task-will-run', task.promise);
        try {
            task.action().then(task.resolve, task.reject);
        }
        catch(error){
            task.reject(error);
        }
        return task.promise;
    }

    /**
     * Cancel a single task.
     * @param task The task you wish to cancel.
     * @param rejectWith An optional object that is passed to the "reject" function.
     */
    cancel(task: PendingTask, rejectWith?: any){
        task.reject(rejectWith);
    }

    /**
     * Remove the first queue element and runs it.
     * @return `undefined` if queue is empty. The task Promise otherwise.
     */
    runNext(): Promise<any> | undefined {
        const task = this.queue.shift();
        if (!task){
            // Nothing to do.
            return;
        }

        return this.run(task);
    }

    /**
     * Returns the current queue and clears it. 
     */
    clearQueue() {
        const old = this.queue;
        this.queue = [];
        return old;
    }

    /**
     * This method cancel any pending task rejecting the associated promise with
     * an error. 
     */
    cancelPending(){
        const cancelError = new TaskCanceledError();
        this.clearQueue().map(i => this.cancel(i, cancelError));
    }

    /**
     * Convenience method to run all pending tasks with a single call. This
     * method supports only 2 basic scheduling policies, for advanced use case
     * implement the logic externally by calling other `run*` methods.
     * @param mode How task should be runned. See enum for details.
     * @return A promise resolving to an array of Promises. Each item of the array is a task promise. 
     * When using the CONCURRENT policy the main Promise is resolved immediately, otherwise when the
     * method stopped processing.
     */
    async runPending(mode: PendingRunMode = PendingRunMode.SERIALIZED): Promise<Promise<any>[]> {
        if (mode == PendingRunMode.CONCURRENT){
            return this.clearQueue().map(i => this.run(i));
        }

        const promises: Promise<any>[] = [];
        while(true){
            const p = this.runNext();
            if (!p)
                break;

            promises.push(p);
            try {
                // If we don't need to check error we just ignore them. 
                await (mode == PendingRunMode.SERIALIZED_UNTIL_ERROR ? p : p.catch(() => undefined));
            }
            catch(err){
                break;
            }
        }
        return promises;
    }
}