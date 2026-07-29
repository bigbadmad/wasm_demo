// Manages a fixed-size pool of module Web Workers as if they were threads.
// Each worker boots the Bootsharp .NET runtime once and is reused for many
// jobs — jobs submitted beyond the pool size queue until a worker frees up.

export class WorkerPool {
    constructor({ size = 4, workerUrl } = {}) {
        this.size = size;
        this.workerUrl = workerUrl;
        this.workers = [];      // { id, worker, state, currentJob }
        this.queue = [];        // pending jobs waiting for a free worker
        this.jobCounter = 0;
        this.listeners = {};

        for (let id = 0; id < size; id++) this._spawn(id);
    }

    on(event, cb) {
        (this.listeners[event] ??= []).push(cb);
    }

    // Submit a job; resolves with { text, elapsed } once some worker runs it.
    run(duration) {
        return new Promise((resolve, reject) => {
            const job = { id: ++this.jobCounter, duration, resolve, reject, queuedAt: performance.now() };
            this.queue.push(job);
            this._emit('queuechange', this.queue.length);
            this._dispatch();
        });
    }

    terminate() {
        for (const entry of this.workers) entry.worker.terminate();
    }

    _spawn(id) {
        const worker = new Worker(this.workerUrl, { type: 'module' });
        const entry = { id, worker, state: 'booting', currentJob: null };
        this.workers[id] = entry;

        worker.onmessage = ({ data }) => this._handleMessage(entry, data);
        worker.onerror = (err) => this._handleError(entry, err);

        this._emit('statechange', entry);
    }

    _handleMessage(entry, data) {
        if (data.type === 'ready') {
            entry.state = 'idle';
            this._emit('statechange', entry);
            this._dispatch();

        } else if (data.type === 'done') {
            const job = entry.currentJob;
            entry.currentJob = null;
            entry.state = 'idle';
            this._emit('jobdone', { entry, job, text: data.text, elapsed: data.elapsed });
            job.resolve({ text: data.text, elapsed: data.elapsed });
            this._emit('statechange', entry);
            this._dispatch();
        }
    }

    _handleError(entry, err) {
        const job = entry.currentJob;
        entry.currentJob = null;
        entry.worker.terminate();
        this._emit('error', { entry, err });

        // Replace the failed worker so the pool stays at full size.
        this._spawn(entry.id);

        if (job) job.reject(err instanceof Error ? err : new Error(err?.message || 'worker error'));
    }

    _dispatch() {
        if (this.queue.length === 0) return;
        const free = this.workers.find(w => w.state === 'idle');
        if (!free) return;

        const job = this.queue.shift();
        this._emit('queuechange', this.queue.length);

        free.state = 'busy';
        free.currentJob = job;
        this._emit('jobstart', { entry: free, job });
        this._emit('statechange', free);

        free.worker.postMessage({ duration: job.duration });
    }

    _emit(event, payload) {
        for (const cb of this.listeners[event] ?? []) cb(payload);
    }
}
