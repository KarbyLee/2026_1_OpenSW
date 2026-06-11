using System;
using System.Runtime.InteropServices;

class Program
{
    private const int GWL_STYLE = -16;
    private const int GWLP_HWNDPARENT = -8;
    private const uint GW_HWNDPREV = 3;
    private const long WS_CHILD = 0x40000000L;
    private const long WS_POPUP = 0x80000000L;
    private const long WS_OVERLAPPEDWINDOW = 0x00CF0000L;
    private static readonly IntPtr HWND_TOP = IntPtr.Zero;
    private const uint SWP_NOSIZE = 0x0001;
    private const uint SWP_NOMOVE = 0x0002;
    private const uint SWP_NOACTIVATE = 0x0010;
    private const uint SWP_FRAMECHANGED = 0x0020;

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr FindWindow(string? className, string? windowName);

    [DllImport("user32.dll")]
    private static extern bool IsWindow(IntPtr window);

    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW", SetLastError = true)]
    private static extern IntPtr GetWindowLongPtr(IntPtr window, int index);

    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW", SetLastError = true)]
    private static extern IntPtr SetWindowLongPtr(IntPtr window, int index, IntPtr newLong);

    [DllImport("user32.dll")]
    private static extern IntPtr GetWindow(IntPtr window, uint command);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool SetWindowPos(
        IntPtr window,
        IntPtr insertAfter,
        int x,
        int y,
        int width,
        int height,
        uint flags
    );

    private static bool AttachAsInteractiveDesktopWidget(IntPtr window)
    {
        IntPtr progman = FindWindow("Progman", null);
        if (progman == IntPtr.Zero)
        {
            Console.Error.WriteLine("Progman 바탕화면 창을 찾지 못했습니다.");
            return false;
        }

        long style = GetWindowLongPtr(window, GWL_STYLE).ToInt64();
        long widgetStyle = (style & ~WS_CHILD & ~WS_OVERLAPPEDWINDOW) | WS_POPUP;

        SetWindowLongPtr(window, GWL_STYLE, new IntPtr(widgetStyle));
        // Keep the widget as an independent top-level window so Chromium can
        // receive pointer and keyboard input reliably.
        SetWindowLongPtr(window, GWLP_HWNDPARENT, IntPtr.Zero);

        // Place the widget immediately above Progman and below every normal app window.
        IntPtr windowAboveDesktop = GetWindow(progman, GW_HWNDPREV);
        IntPtr insertAfter = windowAboveDesktop != IntPtr.Zero ? windowAboveDesktop : HWND_TOP;
        bool positioned = SetWindowPos(
            window,
            insertAfter,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_FRAMECHANGED
        );

        if (!positioned)
        {
            Console.Error.WriteLine($"위젯을 바탕화면 계층에 배치하지 못했습니다. Win32 오류: {Marshal.GetLastWin32Error()}");
            return false;
        }

        return true;
    }

    static int Main(string[] args)
    {
        if (args.Length == 0 || !long.TryParse(args[0], out long handleValue))
        {
            Console.Error.WriteLine("Electron HWND가 필요합니다.");
            return 1;
        }

        IntPtr electronWindow = new IntPtr(handleValue);
        if (!IsWindow(electronWindow))
        {
            Console.Error.WriteLine("전달받은 Electron HWND가 유효하지 않습니다.");
            return 2;
        }

        return AttachAsInteractiveDesktopWidget(electronWindow) ? 0 : 3;
    }
}
