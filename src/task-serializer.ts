import { TaskQueue } from "./task-queue";

const DEFAULT_KEY = Symbol('DEFAULT');

export class TaskSerializer {

    private queues = new Map<Symbol | string, TaskQueue>();

    add<T>(key: string, task: () => Promise<T>): Promise<T>
    add<T>(task: () => Promise<T>): Promise<T>
    add<T>(arg1: string | (() => Promise<T>), arg2?: () => Promise<T>): Promise<T>{
        const key = typeof arg1 === 'string' ? arg1 : DEFAULT_KEY;
        const task = arg2 ? arg2 : arg1 as (() => Promise<T>);

        let q = this.queues.get(key);
        if (q){
            return q.add(task);
        }
        else {
            q = new TaskQueue();
            this.queues.set(key, q);
            const result = q.add(task);

            // If queue didn't exist we need to start processing. When the queue 
            // is depleted we remove it come the map.
            q.runPending().then(() => this.queues.delete(key));
            return result;
        }
    }

}