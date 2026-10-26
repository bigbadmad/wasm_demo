// Manages a capped pool of module Web Workers as if they were threads.
// Each worker boots the Bootsharp .NET runtime once and is reused for many
// jobs. Workers are spawned lazily, on demand, as jobs arrive - not eagerly
// at construction - since each one carries a fair amount of memory (its own
// .NET runtime + business logic library). The pool only ever grows up to
// maxWorkers; jobs beyond that queue until a worker frees up.
//
// A running job may stop part-way to ask the UI a question. The worker sits
// blocked (state 'waiting') until someone calls answer() or cancel() on the
// request emitted with the 'ask' event. A waiting worker still holds its slot
// and its memory - it just isn't burning CPU.

import { writeAnswer, cancelAnswer } from './answer-slot.js';

export class WorkerPool {
    // memoryBudgetBytes: soft cap on total self-reported worker memory - a new
    // worker won't be spawned if it would likely push the pool over this.
    // workerMemoryLimitBytes: per-worker ceiling - a worker that reports more
    // than this after finishing a job gets terminated and replaced, since WASM
    // linear memory can't shrink on its own; recycling is the only way back.
    // Both default to Infinity (no gating), so omitting them keeps the pool's
    // prior count-only-cap behavior unchanged.
    constructor({ maxWorkers = 4, memoryBudgetBytes = Infinity, workerMemoryLimitBytes = Infinity, workerUrl } = {}) {
        this.maxWorkers = maxWorkers;
        this.memoryBudgetBytes = memoryBudgetBytes;
        this.workerMemoryLimitBytes = workerMemoryLimitBytes;
        this.workerUrl = workerUrl;
        this.workers = [];      // spawned so far: { id, worker, state, currentJob, memBytes, slot, pendingAsk }
        this.queue = [];        // pending jobs waiting for a free (or new) worker
        this.jobCounter = 0;
        this.listeners = {};
    }

    on(event, cb) {
        (this.listeners[event] ??= []).push(cb);
    }

    // Submit a job; resolves with { text, elapsed } once some worker runs it,
    // or rejects if one of its `askCount` questions is cancelled.
    run(duration, askCount = 0) {
        return new Promise((resolve, reject) => {
            const job = { id: ++this.jobCounter, duration, askCount, resolve, reject, queuedAt: performance.now() };
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
        const entry = { id, worker, state: 'booting', currentJob: null, memBytes: 0, slot: null, pendingAsk: null };
        this.workers[id] = entry;

        worker.onmessage = ({ data }) => this._handleMessage(entry, data);
        worker.onerror = (err) => this._handleError(entry, err);

        this._emit('statechange', entry);
    }

    _handleMessage(entry, data) {
        if (data.type === 'ready') {
            entry.state = 'idle';
            entry.slot = data.slot;
            entry.memBytes = data.memBytes ?? entry.memBytes;
            this._emit('statechange', entry);
            this._dispatch();

        } else if (data.type === 'progress') {
            this._emit('progress', { entry, job: entry.currentJob, percent: data.percent });

        } else if (data.type === 'ask') {
            const request = {
                entry,
                job: entry.currentJob,
                prompt: data.prompt,
                outcome: null, // 'answered' | 'cancelled' | 'workerlost', once settled
                answer: (text) => this._settleAsk(request, 'answered', () => writeAnswer(entry.slot, String(text))),
                cancel: () => this._settleAsk(request, 'cancelled', () => cancelAnswer(entry.slot)),
            };
            entry.pendingAsk = request;
            entry.state = 'waiting';
            this._emit('statechange', entry);
            this._emit('ask', request);

        } else if (data.type === 'done' || data.type === 'failed') {
            const job = entry.currentJob;
            entry.currentJob = null;
            entry.memBytes = data.memBytes ?? entry.memBytes;
            if (data.type === 'done') {
                this._emit('jobdone', { entry, job, text: data.text, elapsed: data.elapsed });
                job.resolve({ text: data.text, elapsed: data.elapsed });
            } else {
                this._emit('jobfailed', { entry, job, message: data.message, elapsed: data.elapsed });
                job.reject(new Error(data.message));
            }

            if (entry.memBytes > this.workerMemoryLimitBytes) {
                // Over budget - WASM memory only grows, so the only way to
                // reclaim it is to terminate this worker and boot a fresh one
                // in its place, rather than returning it to the idle pool.
                this._emit('recycle', { entry, memBytes: entry.memBytes });
                entry.worker.terminate();
                this._spawn(entry.id);
            } else {
                entry.state = 'idle';
                this._emit('statechange', entry);
            }
            this._dispatch();
        }
    }

    // Answers/cancels at most once, and only while the worker is still the
    // one that asked - a respawned worker in the same slot has a fresh slot
    // buffer and isn't waiting on anything.
    _settleAsk(request, outcome, write) {
        const { entry } = request;
        if (entry.pendingAsk !== request) return;
        entry.pendingAsk = null;
        request.outcome = outcome;
        write();
        entry.state = 'busy';
        this._emit('askclosed', request);
        this._emit('statechange', entry);
    }

    _handleError(entry, err) {
        const job = entry.currentJob;
        entry.currentJob = null;
        if (entry.pendingAsk) {
            const request = entry.pendingAsk;
            entry.pendingAsk = null;
            request.outcome = 'workerlost';
            this._emit('askclosed', request);
        }
        entry.worker.terminate();
        this._emit('error', { entry, err });

        // Replace the failed worker in its same slot so the pool doesn't shrink.
        this._spawn(entry.id);

        if (job) job.reject(err instanceof Error ? err : new Error(err?.message || 'worker error'));
    }

    // Assigning to idle workers and growing the pool are separate concerns,
    // both re-checked on every call: assign first, then - if backlog remains
    // - consider spawning one more. Keeping growth conditional on "no idle
    // worker was found" (instead of "is there still backlog") would let a
    // single steadily-busy worker starve growth forever, since it re-absorbs
    // the next queued job before the pool ever gets a chance to reconsider
    // spawning a second one.
    _dispatch() {
        while (this.queue.length > 0) {
            const free = this.workers.find(w => w.state === 'idle');
            if (!free) break;

            const job = this.queue.shift();
            this._emit('queuechange', this.queue.length);

            free.state = 'busy';
            free.currentJob = job;
            this._emit('jobstart', { entry: free, job });
            this._emit('statechange', free);

            free.worker.postMessage({ jobId: job.id, duration: job.duration, askCount: job.askCount });
        }

        // Backlog remains after using every idle worker. Workers still
        // booting are future capacity already accounted for - each will
        // claim one queued job the moment it's ready - so only spawn beyond
        // that if the backlog is deeper than what's already in flight, and
        // we're still under the count cap, and a new worker is unlikely to
        // blow the memory budget. The new worker's 'ready' message re-enters
        // here, same as every booting worker's does.
        const booting = this.workers.filter(w => w.state === 'booting').length;
        if (this.queue.length > booting && this.workers.length < this.maxWorkers && this._withinMemoryBudget()) {
            this._spawn();
        }
    }

    _withinMemoryBudget() {
        if (this.memoryBudgetBytes === Infinity) return true;
        if (this.workers.length === 0) return true; // no data yet - let the first worker through

        // Don't compound uncertainty: wait for every existing worker to
        // report real usage before betting on whether one more will fit.
        // Otherwise a burst of submissions before any worker has booted
        // would spawn past the budget on nothing but guesses.
        if (this.workers.some(w => w.memBytes === 0)) return false;

        const total = this.workers.reduce((sum, w) => sum + w.memBytes, 0);
        const estimate = total / this.workers.length;
        return total + estimate <= this.memoryBudgetBytes;
    }

    _emit(event, payload) {
        for (const cb of this.listeners[event] ?? []) cb(payload);
    }
}
