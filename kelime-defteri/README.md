# Kelime Defterim

Kişisel İngilizce kelime ve konuşma kalıbı defteri. Arayüz tamamen Türkçe, bilgisayarında çevrimdışı çalışır.
Tek isteğe bağlı dış bağlantı senin Anthropic API anahtarındır.

**Temel kural: sadece senin kelimelerin.** Uygulama boş başlar, hazır kelime listesi yoktur, kendiliğinden kelime
önermez. Neyi ne zaman çalışacağına sen karar verirsin.

---

## Kurulum

### Hazır kurulum dosyası (Windows)

`release/Kelime Defterim Setup 1.0.0.exe` dosyasını çalıştır. Kurulum Başlat menüsüne ve masaüstüne kısayol ekler.
Kod imzalı olmadığı için Windows SmartScreen "Bilinmeyen yayımcı" uyarısı verebilir: **Ek bilgi → Yine de çalıştır**.

### Kaynak koddan (geliştirme modu)

Gerekenler: [Node.js](https://nodejs.org) 22 veya üstü.

```bash
cd kelime-defteri
npm install
npm run dev
```

`npm install`, Electron'un kurulum betiğini çalıştırmazsa (npm 11 bazı betikleri varsayılan olarak engeller) bir kez şunu çalıştır:

```bash
node node_modules/electron/install.js
```

### Kendi kurulum dosyanı üret

```bash
npm run dist        # bulunduğun işletim sistemi için
npm run dist:win    # Windows (NSIS .exe)
npm run dist:mac    # macOS (.dmg) — macOS'ta çalıştırılmalı
npm run dist:linux  # Linux (AppImage)
```

Çıktı `release/` klasörüne yazılır. Derleme araçlarına (Visual Studio vb.) gerek yoktur; SQLite modülü
(better-sqlite3) her işletim sistemi için hazır ikili dosyalarla gelir.

### Testler

```bash
npm test          # FSRS, zamanlayıcı, ayrıştırma ve "sadece benim kelimelerim" testleri
npm run typecheck
```

---

## API anahtarını ekleme (isteğe bağlı)

Anahtar olmadan da uygulamanın tamamı çalışır; sadece yapay zekâ özellikleri (otomatik doldurma, kalıp kontrolü,
konuşma pratiği) kapalı kalır.

**Yol 1 — Ayarlar ekranı (önerilen):** Ayarlar → Yapay zekâ → anahtarı yapıştır → Kaydet. Anahtar işletim
sisteminin güvenli deposuyla (Electron `safeStorage`: Windows DPAPI / macOS Anahtar Zinciri / Linux keyring)
şifrelenerek saklanır. "Test et" ile bağlantıyı dene.

**Yol 2 — .env dosyası:** `kelime-defteri/.env.example` dosyasını `.env` olarak kopyala ve doldur:

```
ANTHROPIC_API_KEY=sk-ant-...
```

`.env` git'e eklenmez (`.gitignore`). Kurulu sürümde `.env` dosyasını veri klasörüne de koyabilirsin
(Ayarlar → Veri klasörü → Klasörü aç). Ayarlar'da girilen anahtar `.env`'den önceliklidir.

Model: varsayılan **Claude Haiku 5.5**; Ayarlar'dan **Claude Sonnet 5.5** seçilebilir.

---

## Kelime ekleme

- **Hızlı ekle:** Ana sayfadaki büyük kutuya yaz ve Enter'a bas, ya da her ekrandan **Ctrl+N** (macOS'ta ⌘N).
  API anahtarı varsa alanlar **otomatik dolar**: kelimeyi yazıp durduğunda IPA, kelime türü, Türkçe anlamlar,
  2 örnek cümle + çeviri, eş/zıt anlamlılar, sık kalıplar ve tahmini CEFR seviyesi gelir; kaydetmeden önce düzenleyebilirsin.
  Hemen Enter'a basarsan kart kaydedilir ve eksik alanlar arka planda tamamlanır (senin yazdığın alanlara dokunulmaz).
  Mevcut kartlar için: Kelimelerim → kartları seç → **Eksikleri doldur**.
  Anahtar yoksa sadece **kelime + anlam** zorunludur.
- **Konuşma kalıbı:** "Konuşma kalıbı" türünü seç: kalıp, anlam, kullanım (resmi/günlük/nötr), boşluklu şablon
  (`I'm looking forward to ___`), kullanım durumu ve örnekler.
- **Toplu ekle:** Kelime ekle → Toplu ekle. Alt alta yapıştır:
  ```
  resilient
  take for granted - hafife almak
  commute: işe gidip gelmek
  ```
  Önizleme tablosunda eksikleri yapay zekâ ile doldurur, onaylarsın. Zaten defterinde olan kelimeler işaretlenir ve eklenmez.
- **CSV / Anki:** Kelime ekle → CSV / Anki. CSV'de ilk sütun kelime, ikinci sütun anlam (veya `term, meaning,
  example, example_tr, tags` başlıkları). Anki için: Dosya → Dışa aktar → *Notes in Plain Text (.txt)*.
- **Listeler ve etiketler:** Eklerken veya Kelimelerim ekranında kartları kendi listelerine ("İş İngilizcesi",
  "Dizi kelimeleri"...) koy, etiketle. Yanlış yaptığın kartlar otomatik olarak **Zor kelimeler** listesine girer.

## Neyi çalışacağını seçmek

Her kartın durumu: **Havuzda** (eklendi, çalışmıyorsun) → **Öğreniyorum** → **Öğrendim**.

- Eklenen her kart önce havuza girer. Kelimelerim'de kartları tek tek veya toplu seçip **Çalışmaya başla** de.
  (Eklerken "Ekle ve çalışmaya başla" da seçebilirsin.)
- **Havuzdan her gün sırayla X yeni kelime al** (Ayarlar → Çalışma) varsayılan **kapalıdır**. Açarsan sadece
  senin havuzundan, eklenme sırasıyla veya Kelimelerim'deki "Benim sıram (sürükle-bırak)" sırasıyla alır; asla rastgele seçmez.
- Bir kartı duraklatabilir, sıfırlayabilir, silebilir, havuza geri alabilirsin.

## Çalışma

Çalış ekranında liste/etiket/tür ve modu seç. Aralıklı tekrar **FSRS** algoritmasıyla (ts-fsrs) sadece
"Öğreniyorum" kartları için yapılır. Planlanan aralık 21 günü geçince kart otomatik **Öğrendim** olur.

Modlar: Kart çevir · Çoktan seçmeli (EN→TR / TR→EN, yanlış şıklar da senin kartlarından) · Yazma (küçük yazım
hatalarına tolerans ve hata gösterimi) · Dinleme · Boşluk doldurma (senin örnek cümlelerinde) · Cümle kurma ·
Kalıp pratiği (AI varsa düzeltir ve Türkçe açıklar) · Karışık.

Kısayollar: **Boşluk** çevir · **1–4** puanla (Bilmiyorum/Zor/İyi/Kolay) · **R** tekrar dinle · **Enter** devam.

**Konuşma pratiği (AI):** senaryo seç (restoran, iş görüşmesi, havalimanı...), kullanılacak kelimelerini işaretle.
Yapay zekâ bu kelime ve kalıpları kullanır, seni de kullanmaya yönlendirir, cevaplarını sesli okur. Sonunda
hatalarının ve kullandığın/kullanamadığın kelimelerinin Türkçe özetini verir.

## Konu tekrarı (dilbilgisi)

Kenar çubuğunda **Konu tekrarı**: 13 hazır konu, her birinde Türkçe konu anlatımı, formül kutusu, ipuçları ve 6 etkinlik:
**Test** (çoktan seçmeli + doğru/yanlış) · **Boşluk doldurma** · **Cümle kurma** · **Eşleştirme oyunu** · **Hız turu (60 sn)** · **Ödev**.

Konular: Geniş zaman (olumlu) · Soru sormak · Olumsuz cümleler · Past Simple · Düzensiz fiiller · Future Simple ·
Present Continuous · Bağlaçlar · Modal fiiller · Past Continuous · Present Perfect · Phrasal verbs · Present Perfect Continuous.
(İstekte "İngilizce bağlaçlar" iki kez geçtiği için tek konu yapıldı.)

- Hazır sorular anahtarsız çalışır. API anahtarı varsa test / boşluk / cümle kurmada **"Yapay zekâ ile yeni sorular"** her
  seferinde taze sorular üretir (cümlelerde mümkünse senin kelimelerin, değilse en basit kelimeler; hiçbiri kartlarına eklenmez),
  **Ödev** yapay zekâ tarafından puanlanır ve Türkçe açıklamayla düzeltilir.
- **Yeni konu ekle** (API anahtarıyla): konu adını yaz, ders ve alıştırmalar otomatik hazırlanır.
- Her etkinliğin en iyi skoru saklanır; doğru cevaplar XP kazandırır ve konu çalışmak da günlük seriye sayılır.

## Bildirimler ve alarmlar

Pencereyi kapatınca uygulama **sistem tepsisinde** çalışmaya devam eder (tamamen kapatmak için tepsi menüsü →
Çıkış). Kurulu sürüm bilgisayar açılınca tepside otomatik başlar (Ayarlar'dan kapatılabilir).

| Bildirim | Varsayılan | Not |
|---|---|---|
| Sabah çalışma alarmı | 08:30 | Sesli alarm penceresi + bildirim, **Ertele (10 dk)** / **Başla** |
| Tekrar hatırlatması | 12:00 | Sadece tekrarı gelen kart varsa |
| Gün içi mini tekrar | Saatte bir | Sadece "Öğreniyorum" listenden; **Anlamını göster** / **Dinle** |
| Akşam seri uyarısı | 21:00 | O gün çalışmadıysan ve serin varsa |
| Haftalık özet | Pazar 20:00 | |
| Sessiz saatler | 23:00–08:00 | Bu aralıkta bildirim gelmez |

Ayarlar → Bildirimler'de **Test bildirimi gönder** ve her tür için deneme butonları vardır.
Bilgisayar uykudan uyanınca kaçırılan görevler değerlendirilir (en fazla bir kez; mini tekrarlar birikmez).

**Odak modu:** kenar çubuğundan veya tepsiden başlat; süre bitince alarm çalar.

## Yedekleme

Ayarlar → Yedekleme:
- **JSON yedeği al:** tüm kartlar, listeler, etiketler, tekrar geçmişi, istatistikler ve ayarlar (API anahtarı hariç).
- **Yedekten geri yükle:** mevcut verilerin yerine geçer (önce onay sorar).
- **CSV olarak dışa aktar:** Excel/Anki'ye aktarmak için.

Veritabanı (`kelime-defterim.db`) uygulamanın kullanıcı veri klasöründedir:
Windows `%APPDATA%\Kelime Defterim`, macOS `~/Library/Application Support/Kelime Defterim`,
Linux `~/.config/Kelime Defterim`. Başka bir klasör kullanmak için (ör. C: diski doluysa) kısayolun hedefine `--data-dir` ekle:

```
"D:\Kelime Defterim\uygulama\Kelime Defterim.exe" "--data-dir=D:\Kelime Defterim\veri"
```

`KELIME_DATA_DIR` ortam değişkeni de aynı işi görür. Otomatik başlatma bu klasörü korur.

---

## Yapılan varsayımlar

- **Sabah alarmı ve odak alarmı sessiz saatlerden muaftır**; bunları sen açıkça kurduğun için.
- Kaçırılan sabah alarmı (bilgisayar uykudaysa) en fazla **2 saat** gecikmeyle bir kez çalar; daha geç uyanırsan atlanır.
- Seri: en az bir tekrar yapılan gün "çalışılmış" sayılır. Seri uyarısı yalnızca devam eden bir serin varsa (en az 1 gün) gelir.
- "Sıfırla" kartı yeni bir FSRS kartıyla "Öğreniyorum" durumuna döndürür. Havuza geri almak için "Havuza al".
- Bir kart seçilen moda uygun değilse (örn. örnek cümlesi yoksa boşluk doldurma) kart çevirme ile sorulur.
  Çoktan seçmeli en az 2 kart gerektirir; şıklar her zaman senin kartlarındır.
- Eş/zıt anlamlılar ve sık kalıplar sadece bilgi alanıdır; **asla ayrı kart olarak eklenmez**.
- Yapay zekâya sadece senin kelime ve kalıpların gönderilir; istemler yeni kelime öğretmemesini ve gerekirse en basit
  kelimeleri kullanmasını şart koşar. Konuşma özetindeki "kullanılan/kullanılmayan" listesi senin listenle filtrelenir.
- **Telaffuz:** önce tarayıcı motorunun (Web Speech) İngilizce sesleri kullanılır. Sistemde Web Speech'in görebildiği
  İngilizce ses yoksa (örn. Windows'ta sadece Türkçe "Tolga" yüklüyse) İngilizce metin Türkçe sesle **okunmaz**;
  bunun yerine işletim sisteminin klasik İngilizce sesi kullanılır (Windows SAPI "Microsoft Zira", macOS `say`,
  Linux `espeak-ng`). Daha doğal ve İngiliz aksanlı sesler için Windows: Ayarlar → Saat ve dil → Konuşma →
  Ses ekle → English (United States / United Kingdom).
- **Mikrofon:** Electron'da Web Speech ses tanıma çoğu sistemde Google sunucularına bağlı olduğu için çalışmaz;
  çalışmazsa mikrofon butonu gizlenir ve yazılı devam edilir (ek servis kullanılmaz).
- Windows bildirim butonları (`Ertele`, `Başla`, `Anlamını göster`, `Dinle`) `kelimedefterim://` protokolüyle çalışır.
  Tam ekran video/oyun sırasında Windows bildirimleri sessizce Bildirim Merkezi'ne alabilir.
- Otomatik başlatma geliştirme modunda (`npm run dev`) sisteme kaydedilmez; sadece kurulu sürümde etkindir.
- Kurulum dosyası kod imzasızdır.

## Mimari

```
kelime-defteri/
├─ src/
│  ├─ shared/        Saf mantık (main + arayüz ortak, birim testli)
│  │   ├─ srs.ts           FSRS (ts-fsrs) sarmalayıcısı
│  │   ├─ schedule.ts      Bildirim zamanlayıcısı, sessiz saatler, seri
│  │   ├─ quiz.ts          Soru üretimi (sadece kullanıcı kartları)
│  │   ├─ text.ts          Yazım toleransı, toplu/CSV/Anki ayrıştırma
│  │   ├─ prompts.ts       AI istemleri (kelime kuralı)
│  │   ├─ notifyContent.ts Bildirim metinleri
│  │   └─ gamification.ts  XP, seviye, rozetler
│  ├─ main/          Electron ana süreç
│  │   ├─ index.ts         Pencereler, tepsi, zamanlayıcı, otomatik başlatma, powerMonitor
│  │   ├─ repo.ts          SQLite (better-sqlite3) veri katmanı
│  │   ├─ api.ts           Arayüze açılan IPC API
│  │   ├─ ai.ts            @anthropic-ai/sdk (yapılandırılmış çıktı)
│  │   ├─ secrets.ts       safeStorage + .env
│  │   ├─ notifier.ts      Yerel bildirimler (Windows toast butonları)
│  │   └─ nativeTts.ts     Yerel İngilizce telaffuz yedeği
│  ├─ preload/       Güvenli köprü (contextIsolation + sandbox)
│  └─ renderer/      React + Tailwind arayüz (sesler Web Audio ile üretilir)
├─ tests/            Vitest birim testleri
├─ scripts/          Simge üretici, geliştirme araçları
└─ build/            Kodla üretilmiş simgeler
```
