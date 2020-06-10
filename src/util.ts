

export const isThenable = (obj: any): obj is Promise<any>  => {
    return obj['then'] && typeof obj['then'] === 'function';
}

export const toPromise = <T>(obj: T | Promise<T>): Promise<any> => {
    if (isThenable(obj)){
        return obj;
    }
    return Promise.resolve(obj);
}

export const delay = (delay: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, delay));
}
