# Sabah Okuması

Her sabah üç kısa okuma önerisi. Birini seçiyorsun, Claude senin için 1–2 sayfalık, sade dille yazılmış bir yazı hazırlıyor. Seçimlerin ve verdiğin puanlar ilgi alanlarını öğretiyor; ertesi günün önerileri buna göre sıralanıyor.

- **Her gün 3 seçenek, sadece 1 seçim.** Seçenekler yan yana (telefonda kaydırmalı) kartlarda, kısa özetleriyle.
- **Konu sınırı yok:** bilim, tarih, biyografi, gerçek olaylar, seyahat, yemeklerin kökeni, icatlar, gelecek senaryoları…
- **Teknik konular sade dille:** terimler açıklanır, benzetmelerle anlatılır.
- **Yeni gün 04:00'te başlar.** O saatten sonra uygulamayı açtığında yeni seçenekler hazırlanır.
- **Notlar:** her yazının kendi not alanı var. Yazıda bir cümleyi seçip "Alıntıla"ya basarak nota ekleyebilirsin.
- **Kütüphane:** geçmiş okumalar ve notlar. Notları `.md` olarak indirebilir, yedek alabilirsin.
- **Telefona kurulabilir (PWA):** ana ekrana eklenince uygulama gibi açılır.

## GitHub Pages'te yayınlama

Repo: `lilseakk-spec/Sabah-okumas-`

**Yol 1: tarayıcıdan (en kolayı)**

1. GitHub'da repoyu aç → **Add file → Upload files**.
2. Bu klasördeki her şeyi sürükle bırak: `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `.nojekyll`, `README.md` ve `icons` klasörü. (`.claude` klasörüne gerek yok.)
3. **Commit changes**.
4. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, Branch: `main` / `(root)` → **Save**.
5. 1–2 dakika sonra uygulama şu adreste açılır: **https://lilseakk-spec.github.io/Sabah-okumas-/**

**Yol 2: komut satırından**

```bash
git init -b main
git add index.html app.js styles.css sw.js manifest.webmanifest .nojekyll README.md icons
git commit -m "Sabah Okuması"
git remote add origin https://github.com/lilseakk-spec/Sabah-okumas-.git
git push -u origin main
```

Sonra 4. adımdaki gibi Pages'i aç.

## Telefona kurma

- **iPhone (Safari):** adresi aç → Paylaş → **Ana Ekrana Ekle**.
- **Android (Chrome):** adresi aç → ⋮ menü → **Uygulamayı yükle** / **Ana ekrana ekle**.

## Claude API anahtarı

1. [console.anthropic.com](https://console.anthropic.com/settings/keys) → API Keys → Create Key.
2. Uygulamada **Ayarlar → API anahtarı** alanına yapıştır → **Kaydet** → **Bağlantıyı test et**.

Anahtar yalnızca o cihazın tarayıcısında (localStorage) saklanır, repoya ya da başka bir sunucuya gitmez; istekler doğrudan `api.anthropic.com`'a yapılır. Yedek dosyasına da anahtar yazılmaz. Anahtarı her cihazda ayrı girmen gerekir. Güvenlik için Console'da bu anahtara aylık harcama limiti koymanı öneririm.

**Yaklaşık maliyet (Claude Opus 5.5 ile):** günde bir öneri çağrısı ve bir yazı, günde yaklaşık 0,10–0,20 $, ayda kabaca 3–6 $ (tahmini). Ayarlar'dan Sonnet 5.5 (daha ucuz) ya da Haiku 5.5 (çok ucuz) seçebilirsin.

## Nasıl çalışıyor?

- Sunucusuz, tamamen statik bir site. Veriler (okumalar, notlar, ilgi profili) tarayıcının localStorage'ında tutulur.
- "Gün" 04:00'te değişir. Statik bir site gece kendi kendine çalışamayacağı için öneriler, 04:00'ten sonra uygulamayı ilk açtığında hazırlanır (birkaç saniye sürer). Yazı da seçtiğinde canlı olarak yazılır (yaklaşık bir dakika).
- İlgi profili: seçtiğin kategori +2, etiketleri +1, seçmediklerin −0,4 puan alır. Okuduktan sonra verdiğin "Çok sevdim / Bana göre değil" puanı da profili günceller. Her gün önerilerden biri bilinçli olarak yeni bir alandan gelir ("Yeni ufuk").
- Opus 5.5 ve Sonnet 5.5'te, güvenlik filtresi zararsız bir yazıyı yanlışlıkla reddederse istek otomatik olarak başka bir modelde tamamlanır (sunucu tarafı yedek model).

## Dosyalar

| Dosya | Görev |
| --- | --- |
| `index.html` | Sayfa iskeleti: Bugün, Okuyucu, Kütüphane, Ayarlar |
| `styles.css` | Tasarım (açık/koyu tema, mobil öncelikli) |
| `app.js` | Uygulama mantığı, Claude API çağrıları, ilgi profili |
| `sw.js` | Çevrimdışı açılış için önbellek |
| `manifest.webmanifest`, `icons/` | Ana ekrana ekleme |

Kod değiştirdikten sonra telefonda eski sürüm görünürse `sw.js` içindeki `VERSION` değerini artır.
