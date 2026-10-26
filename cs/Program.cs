using System.Collections.Generic;
using System.Diagnostics;
using Bootsharp;

public static partial class Program
{
    public static void Main() { }

    // Stand-ins for the kind of things real business logic discovers it needs
    // from the user part-way through a calculation.
    private static readonly string[] Questions = [
        "Customer reference?",
        "Apply loyalty discount? (y/n)",
        "Delivery postcode?",
        "Override quantity?",
    ];

    // Simulates a job that does `durationMs` of CPU work, but stops `askCount`
    // times part-way through to ask the UI something. Each AskUser call is a
    // plain synchronous call from C#'s point of view - the JS behind it blocks
    // this worker thread (Atomics.wait) until the main thread writes the
    // answer into shared memory.
    [Export]
    public static string RunJob(int jobId, int durationMs, int askCount)
    {
        var answers = new List<string>();
        var slices = askCount + 1;
        var sliceMs = durationMs / slices;

        for (var i = 0; i < slices; i++)
        {
            Work(sliceMs, i * sliceMs, durationMs);
            if (i < askCount)
                answers.Add(AskUser(jobId, Questions[(jobId + i) % Questions.Length]));
        }
        ReportProgress(100);

        return answers.Count == 0
            ? "Task complete from C# WASM!"
            : $"Task complete from C# WASM, using answers: \"{string.Join("\", \"", answers)}\"";
    }

    // Busy-waits for `ms`, reporting overall progress roughly every 50 ms.
    private static void Work(int ms, int doneBeforeMs, int totalMs)
    {
        var sw = Stopwatch.StartNew();
        long lastReport = -50;
        while (sw.ElapsedMilliseconds < ms)
        {
            if (sw.ElapsedMilliseconds - lastReport >= 50)
            {
                lastReport = sw.ElapsedMilliseconds;
                ReportProgress(totalMs == 0 ? 100 : (int)((doneBeforeMs + lastReport) * 100 / totalMs));
            }
        }
    }

    // Synchronous on the C# side; implemented in worker.js.
    [Import] public static partial string AskUser(int jobId, string prompt);
    [Import] public static partial void ReportProgress(int percent);
}
