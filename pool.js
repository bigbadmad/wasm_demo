// Manages a capped pool of module Web Workers as if they were threads.
// Each worker boots the Bootsharp .NET runtime once and is reused for many
// jobs. Workers are spawned lazily, on demand, as jobs arrive — not eagerly
// at construction — since each one carries a fair amount of memory (its own
// .NET runtime + business logic library). The pool only ever grows up to
// maxWorkers; jobs beyond that queue until a worker frees up.

export class WorkerPool {
    constructor({ maxWorkers = 4, workerUrl } = {}) {
        this.maxWorkers = maxWorkers;
        this.workerUrl = workerUrl;
        this.workers = [];      // spawned so far: { id, worker, state, currentJob }
        this.queue = [];        // pending jobs waiting for a free (or new) worker
        this.jobCounter = 0;
        this.listeners = {};
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

    // Spawns a new worker at the next free slot (growing the pool), or, if
    // `id` is given, replaces the worker at that existing slot (used to
    // recover from an error without changing the pool's size).
    _spawn(id = this.workers.length) {
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

        // Replace the failed worker in its same slot so the pool doesn't shrink.
        this._spawn(entry.id);

        if (job) job.reject(err instanceof Error ? err : new Error(err?.message || 'worker error'));
    }

    _dispatch() {
        if (this.queue.length === 0) return;
        const free = this.workers.find(w => w.state === 'idle');
        if (!free) {
            // No idle worker — grow the pool if we're still under the cap.
            // The new worker's 'ready' message will trigger dispatch again.
            if (this.workers.length < this.maxWorkers) this._spawn();
            return;
        }

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
