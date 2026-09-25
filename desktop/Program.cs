using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using System.Threading.Tasks;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        if (Array.IndexOf(Environment.GetCommandLineArgs(), "--smoke-test") >= 0)
            File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "smoke-trace.txt"), "Main\n");
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new GameWindow());
    }
}

internal sealed class GameWindow : Form
{
    private readonly WebView2 browser = new WebView2();
    private readonly bool smokeTest = Array.IndexOf(Environment.GetCommandLineArgs(), "--smoke-test") >= 0;
    private int smokePass = 0;
    public GameWindow()
    {
        Text = "远境传说 · 冒险自走棋";
        ClientSize = new Size(1440, 960);
        MinimumSize = new Size(900, 700);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(16, 25, 24);
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        browser.Dock = DockStyle.Fill;
        browser.DefaultBackgroundColor = BackColor;
        Controls.Add(browser);
        Load += Initialize;
    }

    private async void Initialize(object sender, EventArgs args)
    {
        if (smokeTest) File.AppendAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "smoke-trace.txt"), "Initialize\n");
        try
        {
            string content = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "game");
            if (!File.Exists(Path.Combine(content, "index.html")))
                throw new FileNotFoundException("缺少游戏资源，请完整解压游戏文件夹后启动。");
            string cache = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "WildsAndWonders", "WebView2");
            if (smokeTest) cache = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "smoke-profile");
            CoreWebView2Environment environment = await CoreWebView2Environment.CreateAsync(null, cache);
            await browser.EnsureCoreWebView2Async(environment);
            browser.CoreWebView2.SetVirtualHostNameToFolderMapping("wilds.example", content, CoreWebView2HostResourceAccessKind.DenyCors);
            browser.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            browser.CoreWebView2.Settings.IsStatusBarEnabled = false;
            browser.CoreWebView2.Settings.AreDevToolsEnabled = false;
            browser.CoreWebView2.Settings.IsZoomControlEnabled = false;
            browser.CoreWebView2.DocumentTitleChanged += delegate { Text = browser.CoreWebView2.DocumentTitle; };
            if (smokeTest) browser.CoreWebView2.NavigationCompleted += SmokeTest;
            browser.CoreWebView2.NewWindowRequested += delegate(object s, CoreWebView2NewWindowRequestedEventArgs e) { e.Handled = true; };
            browser.CoreWebView2.NavigationStarting += delegate(object s, CoreWebView2NavigationStartingEventArgs e)
            {
                Uri target;
                if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out target) || target.Host != "wilds.example") e.Cancel = true;
            };
            browser.CoreWebView2.Navigate("https://wilds.example/index.html");
        }
        catch (Exception error)
        {
            if (smokeTest) { File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "smoke-error.txt"), error.ToString()); Close(); return; }
            MessageBox.Show("游戏启动失败。请确认游戏文件已完整解压，并已安装 Microsoft Edge WebView2 Runtime。\n\n" + error.Message,
                "远境传说", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    private async void SmokeTest(object sender, CoreWebView2NavigationCompletedEventArgs args)
    {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        try
        {
            if (!args.IsSuccess) throw new Exception("Navigation failed: " + args.WebErrorStatus);
            await Task.Delay(1400);
            if (smokePass == 0)
            using (FileStream file = File.Create(Path.Combine(root, "smoke-preview.png")))
                await browser.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, file);
            if (smokePass == 0)
            {
                string script = File.ReadAllText(Path.GetFullPath(Path.Combine(root, @"..\..\desktop\smoke.js")));
                string result = await browser.CoreWebView2.ExecuteScriptAsync(script);
                File.WriteAllText(Path.Combine(root, "smoke-result.json"), result);
                if (!result.Contains("\"passed\":true")) throw new Exception("UI tests failed: " + result);
                await browser.CoreWebView2.ExecuteScriptAsync("setLanguage('en');showView('lobby');");
                await Task.Delay(200);
                using (FileStream file = File.Create(Path.Combine(root, "smoke-lobby-en.png")))
                    await browser.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, file);
                await browser.CoreWebView2.ExecuteScriptAsync("setLanguage('ja');showView('adventure');openStory(4,'after','read');");
                await Task.Delay(200);
                using (FileStream file = File.Create(Path.Combine(root, "smoke-story-ja.png")))
                    await browser.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, file);
                await browser.CoreWebView2.ExecuteScriptAsync("document.querySelector('#story-dialog').close();storyScene=null;setLanguage('en');stage=1;prepare();showView('adventure');");
                await Task.Delay(200);
                using (FileStream file = File.Create(Path.Combine(root, "smoke-battle-en.png")))
                    await browser.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, file);
                await browser.CoreWebView2.ExecuteScriptAsync("setLanguage('ja');displayHero='moon';stage=2;prepare();saveProfile();");
                smokePass = 1;
                browser.CoreWebView2.Reload();
                return;
            }
            else
            {
                string result = await browser.CoreWebView2.ExecuteScriptAsync("JSON.stringify({passed:language==='ja'&&displayHero==='moon'&&stage===2&&cleared.length===5&&currentView==='lobby',language,displayHero,stage,cleared})");
                File.WriteAllText(Path.Combine(root, "smoke-reload.json"), result);
            }

        }
        catch (Exception error) { File.WriteAllText(Path.Combine(root, "smoke-error.txt"), error.ToString()); }
        Close();
    }
}
