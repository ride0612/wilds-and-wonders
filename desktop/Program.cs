using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using System.Threading.Tasks;
using System.Diagnostics;
using System.Net;
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
        Text = "绝不认书：次元回响";
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
            var environmentOptions = new CoreWebView2EnvironmentOptions();
            if (smokeTest) environmentOptions.AdditionalBrowserArguments = "--autoplay-policy=no-user-gesture-required";
            CoreWebView2Environment environment = await CoreWebView2Environment.CreateAsync(null, cache, environmentOptions);
            await browser.EnsureCoreWebView2Async(environment);
            browser.CoreWebView2.SetVirtualHostNameToFolderMapping("wilds.example", content, CoreWebView2HostResourceAccessKind.DenyCors);
            browser.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            browser.CoreWebView2.Settings.IsStatusBarEnabled = false;
            browser.CoreWebView2.Settings.AreDevToolsEnabled = false;
            browser.CoreWebView2.Settings.IsZoomControlEnabled = false;
            browser.CoreWebView2.DocumentTitleChanged += delegate { Text = browser.CoreWebView2.DocumentTitle; };
            if (smokeTest)
            {
                await browser.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync("window.testErrors=[];window.addEventListener('error',e=>window.testErrors.push(e.message));window.addEventListener('unhandledrejection',e=>window.testErrors.push(String(e.reason)));");
                browser.CoreWebView2.NavigationCompleted += SmokeTest;
            }
            browser.CoreWebView2.NewWindowRequested += delegate(object s, CoreWebView2NewWindowRequestedEventArgs e) { e.Handled = true; };
            browser.CoreWebView2.NavigationStarting += delegate(object s, CoreWebView2NavigationStartingEventArgs e)
            {
                Uri target;
                if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out target) || target.Scheme != "https" || target.Host != "wilds.example") e.Cancel = true;
            };
            browser.CoreWebView2.Navigate("https://wilds.example/index.html");
        }
        catch (Exception error)
        {
            if (smokeTest) { File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "smoke-error.txt"), error.ToString()); Close(); return; }
            MessageBox.Show("游戏启动失败。请确认游戏文件已完整解压，并已安装 Microsoft Edge WebView2 Runtime。\n\n" + error.Message,
                "绝不认书：次元回响", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }


    private async Task CapturePreview(string name, string script)
    {
        await browser.CoreWebView2.ExecuteScriptAsync("window.previewReady=null;(async()=>{try{" + script + ";await Promise.all(Array.from(document.images).filter(img=>img.getClientRects().length&&!img.closest('[hidden]')).map(img=>img.decode()));window.previewReady='ready';}catch(e){window.previewReady='failed: '+String(e.stack||e);}})();");
        for (int i = 0; i < 150; i++)
        {
            await Task.Delay(100);
            string state = await browser.CoreWebView2.ExecuteScriptAsync("window.previewReady");
            if (state == "\"ready\"") break;
            if (state != "null") throw new Exception("Preview " + name + ": " + state);
            if (i == 149) throw new Exception("Preview timed out: " + name);
        }
        await Task.Delay(650);
        using (var file = File.Create(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, name)))
            await browser.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, file);
    }
    private async void SmokeTest(object sender, CoreWebView2NavigationCompletedEventArgs args)
    {
        if (smokePass > 1) return;
        string root = AppDomain.CurrentDomain.BaseDirectory;
        try
        {
            await Task.Delay(1200);
            if (smokePass == 1)
            {
                string reload = await browser.CoreWebView2.ExecuteScriptAsync("({passed:dimensionState.companion==='nono'&&dimensionState.returned&&cleared.length===20,companion:dimensionState.companion,returned:dimensionState.returned,errors:window.testErrors})");
                File.WriteAllText(Path.Combine(root, "smoke-story-reload.json"), reload);
                smokePass=2;Close();return;
            }
            ClientSize = new Size(900, 700);
            await Task.Delay(250);
            await browser.CoreWebView2.ExecuteScriptAsync(File.ReadAllText(Path.Combine(root, @"game\story-smoke.js")));
            string result = await browser.CoreWebView2.ExecuteScriptAsync("window.storySmokeResult");
            File.WriteAllText(Path.Combine(root,"smoke-offline.json"),result);
            if (!result.Contains("\"passed\":true")) throw new Exception(result);
            await CapturePreview("smoke-choice.png", "renderReturnCompanionPicker();");
            await CapturePreview("smoke-dialogue.png", "$('#return-companion-dialog').close();dismissCinematic();openStory(6,'before','read');cinema.shot=7;renderCinematic();revealCinematic();");
            await browser.CoreWebView2.ExecuteScriptAsync("dismissCinematic();openStory(19,'after','advance');completeStory();pendingReturnCompanion='nono';confirmReturnCompanion();completeStory();saveProfile();");
            smokePass=1;browser.CoreWebView2.Reload();
        }
        catch(Exception error)
        {
            File.WriteAllText(Path.Combine(root,"smoke-story-error.txt"),error.ToString());Close();
        }
    }
}
