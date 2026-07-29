using System.Diagnostics;
using Bootsharp;

public static class Program
{
    public static void Main() { }

    [Export]
    public static string BusyWait(int durationMs)
    {
        var sw = Stopwatch.StartNew();
        while (sw.ElapsedMilliseconds < durationMs) { }
        return "Task complete from C# WASM!";
    }
}
