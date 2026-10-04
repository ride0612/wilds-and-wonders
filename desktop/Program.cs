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
    private string serverOrigin;
    private bool migrated = false;
    private bool closeApproved = false;
    private bool closeSaving = false;
    private async void SaveBeforeClose(object sender, FormClosingEventArgs e)
    {
        if (smokeTest || closeApproved || browser.CoreWebView2 == null || browser.Source == null || browser.Source.Host != "127.0.0.1") return;
        e.Cancel = true;
        if (closeSaving) return;
        closeSaving = true;
        bool saved = false;
        try
        {
            await browser.CoreWebView2.ExecuteScriptAsync("window.exitSaveState='saving';(async()=>{if(typeof accountUser!=='undefined'&&accountUser){paused=true;saveProfile();await flushAccountSave();}window.exitSaveState='saved';})().catch(()=>window.exitSaveState='failed');");
            for (int i = 0; i < 120; i++) { await Task.Delay(100); string result = await browser.CoreWebView2.ExecuteScriptAsync("window.exitSaveState"); if (result == "\"saved\"") { saved = true; break; } if (result == "\"failed\"") break; }
        }
        catch { }
        if (saved || MessageBox.Show("账号进度暂时未能同步到本机服务器。是否仍然关闭？\n未同步内容已留在本机备份，返回游戏可重试。", "保存进度 / Save progress", MessageBoxButtons.YesNo, MessageBoxIcon.Warning) == DialogResult.Yes) { closeApproved = true; Close(); }
        closeSaving = false;
    }
    private async Task EnsureServer(string root, string content)
    {
        int port = smokeTest ? 18767 : 18765;
        serverOrigin = "http://127.0.0.1:" + port;
        string expected = "\"gameDir\":\"" + content.Replace("\\", "\\\\") + "\"";
        Func<Task<bool>> ready = async delegate {
            try { using (WebClient client = new WebClient()) { client.Proxy = null; string health = await client.DownloadStringTaskAsync(serverOrigin + "/api/health"); if (!health.Contains("\"service\":\"wilds-and-wonders\"") || !health.Contains("\"version\":\"0.9.0\"") || !health.Contains(expected)) throw new InvalidOperationException("本机服务器端口已被其他版本占用。请关闭旧服务器后重新启动游戏。"); return true; } }
            catch (WebException) { return false; }
        };
        if (await ready()) return;
        string data = smokeTest ? Path.Combine(root, "smoke-server-data") : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "WildsAndWonders", "Server");
        var start = new ProcessStartInfo(Path.Combine(root, @"runtime\node.exe"), "\"" + Path.Combine(root, @"server\server.cjs") + "\" --port " + port + " --game-dir \"" + content + "\" --data-dir \"" + data + "\"");
        start.UseShellExecute = false; start.CreateNoWindow = true; start.WindowStyle = ProcessWindowStyle.Hidden; start.WorkingDirectory = root;
        Process.Start(start);
        for (int i = 0; i < 40; i++) { await Task.Delay(200); if (await ready()) return; }
        throw new Exception("本机账号服务器未能启动。请确认 runtime 与 server 文件夹完整。");
    }
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
        FormClosing += SaveBeforeClose;
    }

    private async void Initialize(object sender, EventArgs args)
    {
        if (smokeTest) File.AppendAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "smoke-trace.txt"), "Initialize\n");
        try
        {
            string content = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "game");
            if (!File.Exists(Path.Combine(content, "index.html")))
                throw new FileNotFoundException("缺少游戏资源，请完整解压游戏文件夹后启动。");
            await EnsureServer(AppDomain.CurrentDomain.BaseDirectory, content);
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
                if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out target) || (target.GetLeftPart(UriPartial.Authority) != serverOrigin && !(target.Scheme == "https" && target.Host == "wilds.example"))) e.Cancel = true;
            };
            browser.CoreWebView2.NavigationCompleted += async delegate {
                if (migrated || browser.Source == null || browser.Source.Host != "wilds.example") return;
                migrated = true;
                string legacy = await browser.CoreWebView2.ExecuteScriptAsync("localStorage.getItem('wilds-and-wonders.profile.v2')");
                await browser.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync("window.legacyProfile=" + legacy + ";");
                browser.CoreWebView2.Navigate(serverOrigin + "/index.html");
            };
            browser.CoreWebView2.Navigate("https://wilds.example/migration.html");
        }
        catch (Exception error)
        {
            if (smokeTest) { File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "smoke-error.txt"), error.ToString()); Close(); return; }
            MessageBox.Show("游戏启动失败。请确认游戏文件已完整解压，并已安装 Microsoft Edge WebView2 Runtime。\n\n" + error.Message,
                "远境传说", MessageBoxButtons.OK, MessageBoxIcon.Error);
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
        if (browser.Source == null || browser.Source.Host != "127.0.0.1" || smokePass > 1) return;
        string root = AppDomain.CurrentDomain.BaseDirectory;
        try
        {
            await Task.Delay(1500);
            if (smokePass == 1)
            {
                string restored = await browser.CoreWebView2.ExecuteScriptAsync("({passed:cleared.length===20&&OWNED_HEROES.includes('moon')&&collectionState.weapons.crescent===1&&accountName==='星野',cleared:cleared.length,heroes:OWNED_HEROES,tickets:collectionState.tickets})");
                File.WriteAllText(Path.Combine(root,"smoke-reload-v9.json"),restored);smokePass=2;Close();return;
            }
            string accountScript=File.ReadAllText(Path.GetFullPath(Path.Combine(root,@"..\..\desktop\account-smoke.js")));
            await browser.CoreWebView2.ExecuteScriptAsync(accountScript);
            string accountResult="null";for(int i=0;i<200&&accountResult=="null";i++){await Task.Delay(100);accountResult=await browser.CoreWebView2.ExecuteScriptAsync("window.accountSmokeResult||null");}
            File.WriteAllText(Path.Combine(root,"smoke-account-v9.json"),accountResult);
            if(!accountResult.Contains("\"passed\":true"))throw new Exception("Account regression: "+accountResult);
            string script=File.ReadAllText(Path.GetFullPath(Path.Combine(root,@"..\..\desktop\smoke-v8.js")));
            await browser.CoreWebView2.ExecuteScriptAsync(script);
            string result="null";for(int i=0;i<450&&result=="null";i++){await Task.Delay(100);result=await browser.CoreWebView2.ExecuteScriptAsync("window.smokeV8Result||null");}
            File.WriteAllText(Path.Combine(root,"smoke-v9.json"),result);
            if(!result.Contains("\"passed\":true"))throw new Exception("V8 regression: "+result);
            await browser.CoreWebView2.ExecuteScriptAsync(File.ReadAllText(Path.GetFullPath(Path.Combine(root,@"..\..\desktop\art-smoke.js"))));
            string artResult="null";for(int i=0;i<200&&artResult=="null";i++){await Task.Delay(100);artResult=await browser.CoreWebView2.ExecuteScriptAsync("window.artSmokeResult||null");}
            File.WriteAllText(Path.Combine(root,"smoke-art-v9.json"),artResult);if(!artResult.Contains("\"passed\":true"))throw new Exception("Artwork regression: "+artResult);
            await CapturePreview("smoke-lobby-v9.png","closeUtilityDialogs();dismissCinematic();setLanguage('zh');showView('lobby');");
            await CapturePreview("smoke-protagonist-picker-v9.png","openProtagonistPicker();");
            await CapturePreview("smoke-collection-v9.png","$('#protagonist-dialog').close();openUtilityDialog('collection-dialog');renderLobby();");
            foreach(string hero in new[]{"oak","arrow","ember","sage","knight","frost","warden","moon"})
                await CapturePreview("smoke-portrait-"+hero+"-v9.png","closeUtilityDialogs();featureProtagonist=false;displayHero='"+hero+"';renderLobby();");
            foreach(string avatar in new[]{"male","female"})
                await CapturePreview("smoke-protagonist-"+avatar+"-v9.png","protagonist='"+avatar+"';featureProtagonist=true;renderLobby();");
            await CapturePreview("smoke-gacha-v9.png","displayHero='oak';await openGacha();gachaBanner='limited-character';gachaResults=[];renderGacha();");
            foreach(string hero in new[]{"moon","knight","frost","ember"})
                await CapturePreview("smoke-card-"+hero+"-v9.png","openCardArtwork({kind:'character',id:'"+hero+"',stars:def('"+hero+"').stars});");
            await CapturePreview("smoke-draw-v9.png","closeCardArtwork();gachaResults=collectionState.history.filter(x=>x.kind==='character').slice(0,10);skipGachaReveal();");
            await CapturePreview("smoke-reveal-v9.png","gachaResults=[{kind:'character',id:'moon',stars:6}];beginGachaReveal();advanceGachaReveal();");
            await CapturePreview("smoke-story-v9.png","gachaResults=[];resetGachaPresentation();closeUtilityDialogs();openStory(19,'before','read');cinema.shot=3;renderCinematic();revealCinematic();");
            await CapturePreview("smoke-chapters-v9.png","dismissCinematic();showView('adventure');showCampaignLibrary();");
            await CapturePreview("smoke-skill-v9.png","stage=19;prepare();$('#chapter-library').hidden=true;$('#chapter-mission').hidden=false;mode='fight';paused=true;syncPresentationLayout();units=[createUnit('frost','blue',2,3),createUnit('moon','blue',4,4),createUnit('knight','blue',5,3),createUnit('boss','red',3,1)];effects=[];emitSkillFx(units[0],units[3]);emitSkillFx(units[1],units[3]);effects.forEach(e=>e.life=e.total*.65);renderUI();draw();");
            ClientSize=new Size(900,700);
            await CapturePreview("smoke-gacha-compact-v9.png","mode='prep';showView('lobby');await openGacha();gachaResults=[];setLanguage('ja');renderGacha();");
            await CapturePreview("smoke-card-compact-v9.png","openCardArtwork({kind:'character',id:'moon',stars:6});");
            await CapturePreview("smoke-reveal-compact-v9.png","closeCardArtwork();gachaResults=[{kind:'character',id:'moon',stars:6}];beginGachaReveal();advanceGachaReveal();");
            await browser.CoreWebView2.ExecuteScriptAsync("gachaResults=[];resetGachaPresentation();renderGacha();");
            string layout=await browser.CoreWebView2.ExecuteScriptAsync("(()=>{const errors=[];for(const lang of ['zh','en','ja']){setLanguage(lang);renderGacha();for(const id of ['draw-1','draw-10']){const r=$('#'+id).getBoundingClientRect();if(r.right>innerWidth||r.bottom>innerHeight)errors.push(lang+id);}}closeUtilityDialogs();for(const lang of ['zh','en','ja']){setLanguage(lang);for(let i=0;i<20;i++)for(const part of ['before','after']){openStory(i,part,'read');for(let k=0;k<cinematicShots(i,part).length;k++){cinema.shot=k;renderCinematic();revealCinematic();const r=$('#story-next').getBoundingClientRect();if(r.bottom>innerHeight||$('#story-dialog').scrollWidth>innerWidth)errors.push(lang+i+part+k);}}}dismissCinematic();return errors;})()");
            File.WriteAllText(Path.Combine(root,"smoke-layout-v9.json"),layout);if(layout!="[]")throw new Exception("Layout overflow "+layout);
            string errors=await browser.CoreWebView2.ExecuteScriptAsync("window.testErrors");File.WriteAllText(Path.Combine(root,"smoke-render-v9.json"),errors);if(errors!="[]")throw new Exception(errors);
            await browser.CoreWebView2.ExecuteScriptAsync("setLanguage('zh');stage=19;prepare();showView('lobby');window.finalSaveReady=false;saveProfile();flushAccountSave().then(()=>window.finalSaveReady=true);");
            for(int i=0;i<100;i++){await Task.Delay(100);if(await browser.CoreWebView2.ExecuteScriptAsync("window.finalSaveReady")=="true")break;if(i==99)throw new Exception("Save timeout");}
            smokePass=1;browser.CoreWebView2.Reload();return;
        }
        catch(Exception error){File.WriteAllText(Path.Combine(root,"smoke-error-v9.txt"),error.ToString());}
        Close();
    }
}
