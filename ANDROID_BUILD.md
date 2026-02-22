# تحويل المشروع إلى APK (Android)

## المتطلبات

- Node.js (إصدار حديث LTS)
- Android Studio (مع Android SDK)
- Java 17 (يفضل من Android Studio)

## 1) تثبيت الحزم

من داخل مجلد المشروع شغّل:

```powershell
npm install
```

## 2) تجهيز نسخة الويب للموبايل

```powershell
npm run build:web
```

هذا الأمر ينشئ مجلد `www` ويضع فيه الملفات اللازمة للتطبيق.

## 3) إضافة منصة أندرويد (مرة واحدة فقط)

```powershell
npm run cap:add:android
```

## 4) مزامنة التغييرات بعد أي تعديل

```powershell
npm run build:web
npm run cap:sync
```

## 5) فتح المشروع في Android Studio

```powershell
npm run cap:open:android
```

ثم داخل Android Studio:

1. اختر `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
2. بعد انتهاء البناء ستجد ملف APK في غالبًا:
   `android\app\build\outputs\apk\debug\app-debug.apk`

## ملاحظات مهمة

- إذا غيّرت `index.html` أو `script.js` أو `styles.css` لازم تعيد:
  `npm run build:web` ثم `npm run cap:sync`.
- النشر على iPhone يحتاج جهاز Mac و Xcode (غير متاح مباشرة من ويندوز).
