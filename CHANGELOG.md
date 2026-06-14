# Reelms Changelog

## 2026-06-13 – 2026-06-14

### Profil Kartı (FriendProfilePopup)
- Profil fotoğrafı artık cover görselinin üzerinde görünüyor — `z-index` ve negatif margin düzenlemesiyle avatar cover'a bindirildi (avatar yarısı cover üzerinde, yarısı içerik alanında)
- Ad ve kullanıcı adı cover'ın altına alındı — `padding-top: 28px` ile cover bitişiğinde konumlandırıldı
- Avatar boyutu 48px → 54px, `box-shadow` ile tema renginde halka eklendi
- Arkadaşın kendi teması varsa (profileTheme), profil kartı o temaya göre renkleniyor — cam efekti arka planı da dahil
- Sağ panele 5px boşluk: `rightPanelWidth` prop'u ile kartın sağ panel üzerine gelmesi engellendi
- Dikey taşma koruması güçlendirildi (`clampH` ile ekran dışı çıkma engeli)
- "Tüm profili gör" butonu tam profil sayfasını açıyor

### Dinamik Bar (Yatay Sohbet/Topluluk Çubuğu)
- Sağ tık context menü eklendi:
  - **DM:** Arkadaş profilini gör (tam profil), Bildirimleri sessize al/aç, Dinamik sohbetlerde gizle, Sohbeti sil
  - **Grup:** Bildirimleri sessize al/aç, Dinamik sohbetlerde gizle, Sohbeti temizle
  - **Reelm:** Sessize al/aç, Dinamik sohbetlerde gizle
  - **Tümü:** Sabitle / Sabitlemeyi kaldır
- Bildirimleri sessize alınan sohbetlerde ses ve okunmamış sayacı iptal ediliyor
- Gizlenen öğeler bardan kayboluyor; Ayarlar → Gizlilik'te "Dinamik sohbetler'de gizlenen içeriği göster" toggle'ı ile gösterilebilir
- Tüm sohbetler (DM + grup) okunmuş olsa bile barda görünmeye devam ediyor

### Erişilebilirlik Ayarları
- Yazı boyutu etiketleri düzeltildi: Small / Default / Big / Bigger

### Görünüm & Tema
- Reelm menüleri (kategori, kanal sağ tık, vs.) frosted glass efekti kazandı
- Mobil slide paneller layout sistemi içinde kısıtlandı (viewport taşması engellendi)
- GIF/Sticker sağlayıcısı Tenor'dan Giphy'ye geçirildi
- Zaman damgası boşlukları ve okundu bildirim konumları düzeltildi
- Sol panel minimum genişliği azaltıldı

### Güvenlik & Şifreleme
- E2EE: Kendi gönderilen mesajlar artık doğru şekilde çözülüyor (NaCl box simetrisi)
- Bot komutları artık doğrudan listeleniyor (bot seçim adımı kaldırıldı)

### Build
- Kritik build hatası düzeltildi: aynı scope'ta çift `const t` tanımı (esbuild parse error)
- Profil popup render crash düzeltildi: kullanılmayan `embedded` prop temizlendi
