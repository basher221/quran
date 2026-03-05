ضع ملفات الأوفلاين هنا.

الهيكل المطلوب:

- `offline-data/quran-uthmani.json`
- `offline-data/audio/Yasser_Ad-Dussary_128kbps/*.mp3`
- `offline-data/audio/MaherAlMuaiqly128kbps/*.mp3`
- `offline-data/audio-surah/Yasser_Ad-Dussary/001.mp3`
- `offline-data/audio-surah/koonoz_blogspot_com_Maher/001.mp3`

دعم `سورة كاملة` المحلي يعتمد على هذا المسار:

- ياسر الدوسري: `offline-data/audio-surah/Yasser_Ad-Dussary/001.mp3`
- ماهر المعيقلي: `offline-data/audio-surah/koonoz_blogspot_com_Maher/001.mp3`

ويجب تسمية الملفات برقم السورة من 3 خانات:

- الفاتحة: `001.mp3`
- البقرة: `002.mp3`
- الناس: `114.mp3`

لتجهيز ملفات `آية-آية` تلقائيا استخدم:

`.\prepare-offline.ps1 -DownloadAudio`

ملاحظة:

- السكربت الحالي ينزّل ملفات `آية-آية` فقط.
- ملفات `سورة كاملة` توضع يدويًا داخل `audio-surah` بالأسماء المذكورة أعلاه.
