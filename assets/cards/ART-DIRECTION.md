# v0.9 アートディレクションと生成記録

制作モード：内蔵 imagegen。10 枚の立ち絵は transparent_background=true、4 枚のカードは false。解像度は 1024 × 1536。既存の自作キャラクター画像を設定資料として参照し、1 ファイルにつき 1 回の生成を行った。画家の原画そのものを入力・転載したものではない。参考調査は [REFERENCES.md](REFERENCES.md) を参照。

立ち絵は大きな明暗面と線の強弱を重視し、装飾と反射を抑えた。カードはキャラクターの性格と物語の一場面を重視。鑑賞・召喚画面の枠、星、文字は画像に焼き込まず UI で表示する。

旧ファイルは保持し、新立ち絵には v2 を付けた。カードの v1 はゲームへの初回採用版を表す。下記は共通プロンプト＋各キャラクター追記の全文。実際の生成結果には解釈差がある。

## 立ち絵 10 枚

### 共通プロンプト

```text
Use case: style-transfer. Asset: a single full-body standing portrait sprite for an original Japanese anime fantasy RPG. Reference image only defines this adult character's identity, colors and costume motifs; completely REDRAW it as a contemporary 2D illustrator's finished character sheet. Strong economical variable-weight pencil-and-ink outlines, beautifully designed large shapes, restrained 2-step cel shadows, matte colors, sparse hand-painted gouache texture. Fine facial draftsmanship with asymmetrical natural expression; narrow carefully drawn eyes, believable five-finger hands. Reduce all gold/metal filigree and jewelry to a few meaningful motifs. Clear material distinction using line and flat tone, NOT raytraced specular shine. Large calm unpatterned areas in clothing, elegant anime proportions, full head and boots with 5% clear space. Figure standing in a natural lively contrapposto and occupying 88% height, three-quarter view facing viewer. Actual alpha-transparent background, completely isolated character including weapon; no floor, no vignette, no glow behind figure, no text, no watermark, no card frame, no props floating outside silhouette. NOT 3D, not doll-like, no airbrushed skin, no photoreal rendering, no dense generated microdetail, no excessive shiny gradients. Clothes stay fully worn and tasteful. 
```

### protagonist-male-v2.png

保存先：`assets/characters/protagonist-male-v2.png`

参照：`assets/characters/protagonist-male-portrait.png`

```text
22-year-old man, thoughtful but determined, tousled short charcoal-black hair with one ivory streak, amber eyes. Coordinated academy field uniform: clean ivory long coat, navy lapels and lining, navy vest and trousers, burgundy tie, ONE small gold star brooch, brown belt, dark boots. Remove floral embroidery and long chains. His left hand loosely holds a closed navy notebook against hip, right hand lightly adjusts one glove. Small self-conscious smile. Athletic but ordinary young adult build. The design must match a female counterpart with the same exact uniform components.
```

### protagonist-female-v2.png

保存先：`assets/characters/protagonist-female-v2.png`

参照：`assets/characters/protagonist-female-portrait.png`

```text
22-year-old woman, clever and quietly brave, charcoal-black medium-long hair tied in a low loose ponytail, one ivory streak at temple, amber eyes. Coordinated academy field uniform: clean ivory long coat, navy lapels and lining, navy vest and trousers, burgundy tie, ONE small gold star brooch, brown belt, dark boots. Remove floral embroidery and long chains. Closed navy notebook held to her side by left hand; right hand relaxed near collar. Slight playful determined smile and lightly tilted head. Natural adult proportions. Must match the male academy protagonist's exact uniform components, both wear trousers.
```

### frost-portrait-v2.png

保存先：`assets/characters/frost-portrait-v2.png`

参照：`assets/characters/frost-portrait.png`

```text
Frost Whisper, 25-year-old quiet perceptive woman with ice-blue short bob, aqua eyes, reserved gentle expression with slightly downturned gaze. Ivory high-collar coat with navy fitted underlayer and trousers, silver-blue simple snowflake clasp, translucent pale-blue shoulder shawl drawn with just two calm tones. Hold a straight silver staff topped by one angular ice crystal with clearly separated fingers. Other hand relaxed near heart. Slender adult posture, head tilted as if listening, no glossy doll face. Palette muted glacier blue, deep navy, cool paper white. Simplify snowflake embroidery to only one or two motifs.
```

### moon-portrait-v2.png

保存先：`assets/characters/moon-portrait-v2.png`

参照：`assets/characters/moon-portrait.png`

```text
Moon Huntress, 26-year-old independent woman with long black hair ending in silver-grey, violet eyes, calmly observant half-smile. Tailored black high-neck combat uniform with dark trousers, long open ivory coat with muted lavender lining, one silver crescent clasp, black gloves and boots. Left hand on a simple silver crescent bow held upright, right hand holding one folded letter near waist. Strong angular silhouette with one flowing coat-tail, loose hair shapes, dignified confident stance. Palette ink black, chalk ivory, muted lavender, small violet accent. Simplify all silver/gold curls on coat to clean edging.
```

### oak-portrait-v2.png

保存先：`assets/characters/oak-portrait-v2.png`

参照：`assets/characters/oak-portrait.png`

```text
Oak Guardian, adult man about 32, sturdy broad build, grey-brown swept-back short hair, calm green eyes, strong eyebrows, reassuring restrained smile. Ivory and forest olive green guard's coat, short olive cape over one shoulder, brown trousers, bronze plain shoulder armor, tall boots. One large simple bronze-and-olive oak shield with ONE oak leaf emblem rests beside his grounded boots, hand holds shield edge. Other hand hangs relaxed at belt. Strong grounded triangular silhouette, no coat embroidery except one cuff leaf. Masculine mature face.
```

### arrow-portrait-v2.png

保存先：`assets/characters/arrow-portrait-v2.png`

参照：`assets/characters/arrow-portrait.png`

```text
Wind Archer, athletic adult woman about 24, emerald high ponytail, yellow-green lively eyes, friendly crooked open smile, arched eyebrows. Simple short forest-green cape over ivory tunic, fitted black trousers, brown gloves and tall practical boots, muted gold leaf clasp. A lightweight folding bow loosely held lowered in left hand, right hand offers a casual two-finger greeting near shoulder, clean fingers and natural elbow. One foot stepped forward with playful confident energy. Keep long ponytail in two or three expressive big locks, not dozens of tiny strands. No breast emphasis.
```

### ember-portrait-v2.png

保存先：`assets/characters/ember-portrait-v2.png`

参照：`assets/characters/ember-portrait.png`

```text
Ember Sorceress, spirited adult woman about 25, long copper-red high ponytail and amber eyes, slightly rebellious teasing grin. Tailored burgundy and black long combat coat over ivory high-neck blouse, navy-black trousers, red gloves, black lace boots. One simple red crystal staff in left hand angled beside her, right hand planted on hip, head tilted, confident natural contrapposto. Coat tails flick outward in a bold S-curve. Limit motif to one flame-shaped brass clasp and red crystal earrings, remove repetitive filigree. Bold rust red, warm ivory, deep charcoal.
```

### sage-portrait-v2.png

保存先：`assets/characters/sage-portrait-v2.png`

参照：`assets/characters/sage-portrait.png`

```text
Gentle Healer, adult man about 27, soft mint-green wavy short hair, round thin silver glasses, pale green eyes, gentle warm smile, slender masculine face. Simple ivory physician's long coat with muted teal lining and sage green vest, forest trousers, brown shoes, small leather medical satchel. Hold a slender wooden staff topped by a single pale mint leaf-shaped crystal in right hand; left hand extended palm up invitingly with five well-drawn fingers. Calm softly curved silhouette and slightly inclined head. One leaf pin, no endless ornamental flower embroidery, no floating particles.
```

### knight-portrait-v2.png

保存先：`assets/characters/knight-portrait-v2.png`

参照：`assets/characters/knight-portrait.png`

```text
Dawn Knight, adult man around 28, honey blond short tousled hair, amber eyes, strong masculine face with composed resolute expression. Clean ivory armor with muted gold edges, navy cape and navy cloth under armor, dark leather boots. One sun motif on chest and one at simple sword guard; remove all repeated star studs and ornamental chains. Left hand holds straight sun sword point downward beside his boot; right hand resting over heart as a solemn vow. Athletic natural stance, face turned slightly three-quarter toward viewer. Matte armor indicated by a few broad flat planes, no glossy reflections. Broad clean silhouette.
```

### warden-portrait-v2.png

保存先：`assets/characters/warden-portrait-v2.png`

参照：`assets/characters/warden-portrait.png`

```text
Rune Warden, adult man around 29, short violet-black hair with one silver streak, violet eyes, quiet stern expression, a simple silver half mask only over left temple/eye. Long clean black-violet academy coat with angular silver piping, purple waist sash, dark trousers and boots. One angular hexagonal rune forearm guard; right hand lifting his gloved sleeve as if preparing a ward, left fist relaxed down. No floating magic, no particles. One or two geometric rune emblems only. Slim athletic masculine physique and composed upright silhouette, asymmetrical coat tails. Mostly ink black, dusty violet and silver.
```

## 月影・曙光カード

### 共通プロンプト

```text
Use case: stylized-concept. Create a finished original Japanese anime game character card illustration, portrait 2:3 aspect ratio, edge-to-edge artwork, NO lettering, signature, frame or UI. Input image is a CHARACTER IDENTITY AND COSTUME reference only. Deliberately redraw with a convincing 2D illustrator's touch: expressive confident thin-to-thick ink contours, crisp two-tone cel shadows, large matte gouache color shapes, selective dry-brush texture and a few visible construction-like strokes in fabric/hair. Carefully drawn attractive adult face and natural asymmetric expression. Beautifully art-directed, restrained, not photoreal or 3D. Clear silhouette; meaningful negative space. Simplify tiny ornamental details to a few recognizable motifs. NO glossy doll skin, overpolished airbrush gradients, bloom, lens flare, random glitter, dense gold filigree, generic symmetrical halo or repetitive microdetails. Costume stays fully clothed and tasteful. Focal character fills about 75% height; readable face in upper third. 
```

### moon-card-v1.png

保存先：`assets/cards/moon-card-v1.png`

参照：`assets/characters/moon-portrait.png`

```text
Subject: Moon Huntress, adult woman around 25, preserve reference black hair with silver tips, violet eyes, black tailored combat suit and flowing ivory coat with muted violet lining, silver crescent bow. Composition: strong quiet triangular composition, seated sideways on a broken stone balustrade, one boot braced lower, holding her tall bow loosely in one hand while her other hand holds a folded pale letter near her lap; head turns toward viewer with a small confident melancholy smile. Three-quarter view, all hands anatomically clear. Coat ribbons and hair drawn as broad flowing ink shapes across lower right. Scene: ink-blue night, a pale off-center crescent moon and only two simplified gothic arches, quiet mauve sky occupying upper left. Limited ink navy, lavender grey, chalk ivory, a tiny warm rose accent. Richly drawn face but economical atmospheric background. A mature hand-drawn artbook cover with poetic stillness.
```

### knight-card-v1.png

保存先：`assets/cards/knight-card-v1.png`

参照：`assets/characters/knight-portrait.png`

```text
Subject: Dawn Knight, adult man around 28, preserve blond tousled hair, amber eyes, white-and-muted-gold armor, navy cape, star/sun insignia and straight sun sword from reference. Composition: heroic foreshortened three-quarter standing figure, head tilted slightly toward sunrise with a resolute imperfect half-smile, right gloved hand gripping sword pointed down across lower foreground, left hand drawing cape back. Confident masculine face and solid anatomy, no feminine doll face. Broad navy cape sweeps toward left, strong diagonal cream armor. Scene: dawn over a ruined academy courtyard, one broken arch and sunlit stone stair abstracted into large shapes. Palette dusty ochre sunlight, desaturated teal shadows, warm ivory, ink blue. Face and hands most detailed; armor has clear simple flat planes with small brushed highlights, not engraved with endless gold curls. One red ribbon accent. Narrative feeling of a knight who has survived a hard night and chooses to keep going.
```

## 霜語・余燼カード

### 共通プロンプト

```text
Use case: stylized-concept. A finished original Japanese anime fantasy RPG card illustration, portrait 2:3. Single adult character dominant in frame, full-bleed illustrated environment, no UI, letters, logos or card frame. Use the reference only for character identity/costume. Hand-drawn key visual quality, confident varied ink line weight, crisp 2-step cel shadows, expressive face and carefully drawn hands. Matte gouache color blocks, a few dry-brush strokes, big quiet areas contrasting precise focal detail. Restrained limited palette, meaningful asymmetrical composition, clean silhouette. No glossy plastic skin, 3D rendering, photorealism, lens flare, bloom, repetitive decorative filigree or masses of floating glitter. 
```

### frost-card-v1.png

保存先：`assets/cards/frost-card-v1.png`

参照：`assets/characters/frost-portrait.png`

```text
Frost Whisper, adult woman about25, ice-blue bob and aqua eyes, reserved gentle expression. Ivory high-collar coat over navy trousers, pale ice-blue shawl, crystal staff resting beside her. She sits quietly sideways on a broad stone windowsill in an abandoned polar observatory, holding a folded letter with both hands, gazing past viewer pensively. Her face in upper third, body and long coat form one soft triangular silhouette. Outside a huge square window: a flat turquoise frozen sea, low navy horizon, pale morning sky, almost empty. A few foreground shadow shapes create intimacy. Muted glacier teal, ink navy, chalk white, one small warm coral seal on letter. Show emotion through eyes and posture, NOT icy magical particles. Deliberately understated painterly artbook illustration.
```

### ember-card-v1.png

保存先：`assets/cards/ember-card-v1.png`

参照：`assets/characters/ember-portrait.png`

```text
Ember Sorceress, adult woman about25, copper-red high ponytail, amber eyes, fearless sideways grin. Burgundy-black long coat over white high-collar blouse and black trousers, red gloves, simple red crystal staff. Dynamic three-quarter figure pivoting toward viewer on a diagonal, weight clearly on back leg, one hand gripping the staff across body and other loosely extended with clear fingers. Coat and ponytail form two broad rhythmic curves. Scene: academy archive after a storm, a single tilted dark bookshelf in back, a few sheets of paper swept across lower foreground, one broad stylized orange brushstroke of flame along the staff far from face. Strong charcoal, muted burgundy, warm cream and orange palette. Face and hands crisp, background simplified. More graphic energy than ornament, no fire phoenix, no random sparks or halo.
```

