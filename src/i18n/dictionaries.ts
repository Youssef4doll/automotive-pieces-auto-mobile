import type { Locale } from './locales';

/**
 * Every string the app renders, in all three languages.
 *
 * Flat dot-path keys, like the website's dictionary, and the same rule about
 * what is NOT in here: catalogue vocabulary stays in French across all three
 * locales. "Filtre à huile", "Clio IV", "1.5 dCi" are the shop's real-world
 * names for things — they are what is printed on the box and what the counter
 * staff say — so they come from the database untranslated and are never
 * looked up here.
 *
 * Where a string already exists on the website it is copied verbatim rather
 * than re-translated. "Mon garage" is called "Mon garage" in both front doors
 * or it is two different features to the same customer.
 */
const dict = {
  fr: {
    'app.name': 'Automotive Pièces Auto',

    'tab.home': 'Accueil',
    'tab.garage': 'Mon garage',

    'home.greeting': 'Vos pièces auto',
    'home.noVehicle': "L'app ne connaît pas encore votre voiture.",
    'home.noVehicleWhy':
      "Dites-la une fois. Ensuite chaque pièce indique si elle lui va — ou si c'est à vérifier.",
    'home.yourVehicle': 'Votre véhicule',

    'garage.title': 'Mon garage',
    'garage.active': 'Actif',
    'garage.remove': 'Retirer ce véhicule',
    'garage.addAnother': 'Ajouter un autre véhicule',
    'garage.add': 'Ajouter un véhicule',
    'garage.changeCar': 'Changer de voiture',
    'garage.empty': "Aucun véhicule enregistré pour l'instant.",
    'garage.emptyWhy':
      "Marque, modèle, motorisation — 3 choix. Tout est sur votre carte grise.",
    'garage.removeConfirmTitle': 'Retirer ce véhicule ?',
    'garage.removeConfirmBody': 'Il disparaît de ce téléphone. Rien d’autre ne change.',
    'garage.setActive': 'Rendre actif',
    'garage.full':
      'Le garage est plein. Retirez un véhicule pour en ajouter un autre.',

    'picker.stepMake': 'Marque',
    'picker.stepModel': 'Modèle',
    'picker.stepEngine': 'Motorisation',
    'picker.step': 'Étape {n} sur 3',
    'picker.chooseMake': 'Choisissez la marque',
    'picker.chooseModel': 'Choisissez le modèle',
    'picker.chooseEngine': 'Choisissez la motorisation',
    'picker.filter': 'Filtrer…',
    'picker.noMatch': 'Aucun résultat pour « {q} ».',
    'picker.noMatchHint': 'Vérifiez l’orthographe, ou effacez le filtre.',
    'picker.noMakes': "La boutique n'a encore aucune donnée véhicule.",
    'picker.noModels': "Aucun modèle enregistré pour cette marque.",
    'picker.noEngines': "Aucune motorisation enregistrée pour ce modèle.",
    'picker.missingData':
      "Si votre voiture n'est pas dans la liste, écrivez-nous : nous l'ajoutons.",
    'picker.since': 'depuis',
    'picker.engineCount': '{n} motorisation(s)',
    'picker.modelCount': '{n} modèle(s)',
    'picker.partCount': '{n} pièce(s) référencée(s)',
    'picker.noPartsYet': 'Aucune pièce encore référencée pour cette voiture',
    'picker.alreadySaved': 'Déjà dans votre garage',

    'fit.unknownShort': 'À vérifier',

    'state.loading': 'Chargement…',
    'state.offlineTitle': 'Pas de connexion',
    'state.offlineBody':
      "L'app n'a pas pu joindre la boutique. Vérifiez votre connexion et réessayez.",
    'state.serverTitle': 'La boutique ne répond pas',
    'state.serverBody': 'Réessayez dans un instant.',
    'state.notFoundTitle': 'Introuvable',
    'state.retry': 'Réessayer',

    'a11y.back': 'Retour',
    'a11y.clearFilter': 'Effacer le filtre',

    'lang.title': 'Langue',
    'lang.rtlRestart':
      "L'arabe se lit de droite à gauche. Redémarrez l'app pour que la mise en page suive.",
  },

  en: {
    'app.name': 'Automotive Pièces Auto',

    'tab.home': 'Home',
    'tab.garage': 'My garage',

    'home.greeting': 'Your car parts',
    'home.noVehicle': "The app doesn't know your car yet.",
    'home.noVehicleWhy':
      'Tell it once. After that every part says whether it fits — or that it needs checking.',
    'home.yourVehicle': 'Your vehicle',

    'garage.title': 'My garage',
    'garage.active': 'Active',
    'garage.remove': 'Remove this vehicle',
    'garage.addAnother': 'Add another vehicle',
    'garage.add': 'Add a vehicle',
    'garage.changeCar': 'Change car',
    'garage.empty': 'No saved vehicles yet.',
    'garage.emptyWhy':
      'Make, model, engine — 3 choices. All of it is on your registration document.',
    'garage.removeConfirmTitle': 'Remove this vehicle?',
    'garage.removeConfirmBody': 'It leaves this phone. Nothing else changes.',
    'garage.setActive': 'Make active',
    'garage.full': 'The garage is full. Remove a vehicle to add another.',

    'picker.stepMake': 'Make',
    'picker.stepModel': 'Model',
    'picker.stepEngine': 'Engine',
    'picker.step': 'Step {n} of 3',
    'picker.chooseMake': 'Choose the make',
    'picker.chooseModel': 'Choose the model',
    'picker.chooseEngine': 'Choose the engine',
    'picker.filter': 'Filter…',
    'picker.noMatch': 'Nothing matches “{q}”.',
    'picker.noMatchHint': 'Check the spelling, or clear the filter.',
    'picker.noMakes': 'The shop has no vehicle data yet.',
    'picker.noModels': 'No models recorded for this make.',
    'picker.noEngines': 'No engines recorded for this model.',
    'picker.missingData': 'If your car is not listed, write to us and we will add it.',
    'picker.since': 'since',
    'picker.engineCount': '{n} engine(s)',
    'picker.modelCount': '{n} model(s)',
    'picker.partCount': '{n} part(s) listed',
    'picker.noPartsYet': 'No parts listed for this car yet',
    'picker.alreadySaved': 'Already in your garage',

    'fit.unknownShort': 'To check',

    'state.loading': 'Loading…',
    'state.offlineTitle': 'No connection',
    'state.offlineBody': 'The app could not reach the shop. Check your connection and try again.',
    'state.serverTitle': 'The shop is not answering',
    'state.serverBody': 'Try again in a moment.',
    'state.notFoundTitle': 'Not found',
    'state.retry': 'Try again',

    'a11y.back': 'Back',
    'a11y.clearFilter': 'Clear the filter',

    'lang.title': 'Language',
    'lang.rtlRestart':
      'Arabic reads right to left. Restart the app so the layout follows.',
  },

  ar: {
    'app.name': 'Automotive Pièces Auto',

    'tab.home': 'الرئيسية',
    'tab.garage': 'مرآبي',

    'home.greeting': 'قطع غيار سيارتك',
    'home.noVehicle': 'التطبيق لا يعرف سيارتك بعد.',
    'home.noVehicleWhy':
      'أخبرنا بها مرّة واحدة. بعدها تُظهر كل قطعة إن كانت تناسبها، أو أنّها تحتاج تحقّقاً.',
    'home.yourVehicle': 'سيارتك',

    'garage.title': 'مرآبي',
    'garage.active': 'نشطة',
    'garage.remove': 'إزالة هذه السيارة',
    'garage.addAnother': 'إضافة سيارة أخرى',
    'garage.add': 'إضافة سيارة',
    'garage.changeCar': 'تغيير السيارة',
    'garage.empty': 'لا توجد سيارات محفوظة بعد.',
    'garage.emptyWhy': 'الماركة، الطراز، المحرّك — 3 اختيارات. كلّها في بطاقة السيارة.',
    'garage.removeConfirmTitle': 'إزالة هذه السيارة؟',
    'garage.removeConfirmBody': 'ستُحذف من هذا الهاتف. لا شيء آخر يتغيّر.',
    'garage.setActive': 'جعلها نشطة',
    'garage.full': 'المرآب ممتلئ. أزِل سيارة لإضافة أخرى.',

    'picker.stepMake': 'الماركة',
    'picker.stepModel': 'الطراز',
    'picker.stepEngine': 'المحرّك',
    'picker.step': 'الخطوة {n} من 3',
    'picker.chooseMake': 'اختر الماركة',
    'picker.chooseModel': 'اختر الطراز',
    'picker.chooseEngine': 'اختر المحرّك',
    'picker.filter': 'تصفية…',
    'picker.noMatch': 'لا نتائج لـ «{q}».',
    'picker.noMatchHint': 'تحقّق من الإملاء، أو امسح التصفية.',
    'picker.noMakes': 'لا بيانات سيارات لدى المتجر بعد.',
    'picker.noModels': 'لا طُرُز مسجّلة لهذه الماركة.',
    'picker.noEngines': 'لا محرّكات مسجّلة لهذا الطراز.',
    'picker.missingData': 'إن لم تكن سيارتك في القائمة، راسلنا ونضيفها.',
    'picker.since': 'منذ',
    'picker.engineCount': '{n} محرّك',
    'picker.modelCount': '{n} طراز',
    'picker.partCount': '{n} قطعة مُدرجة',
    'picker.noPartsYet': 'لا قطع مُدرجة لهذه السيارة بعد',
    'picker.alreadySaved': 'موجودة في مرآبك',

    'fit.unknownShort': 'للتحقّق',

    'state.loading': 'جارٍ التحميل…',
    'state.offlineTitle': 'لا اتصال',
    'state.offlineBody': 'تعذّر على التطبيق الوصول إلى المتجر. تحقّق من اتصالك وأعد المحاولة.',
    'state.serverTitle': 'المتجر لا يستجيب',
    'state.serverBody': 'أعد المحاولة بعد لحظة.',
    'state.notFoundTitle': 'غير موجود',
    'state.retry': 'إعادة المحاولة',

    'a11y.back': 'رجوع',
    'a11y.clearFilter': 'مسح التصفية',

    'lang.title': 'اللغة',
    'lang.rtlRestart': 'العربية تُقرأ من اليمين إلى اليسار. أعد تشغيل التطبيق ليتبع التصميم.',
  },
} as const;

export type DictKey = keyof (typeof dict)['fr'];

/**
 * The three dictionaries are checked against each other at compile time.
 *
 * A key added to French and forgotten in Arabic used to be discovered by an
 * Arabic-speaking customer reading a French sentence. Now it is a type error
 * in this file. The cost is that adding a string means writing all three,
 * which is the point.
 */
type Complete = Record<Locale, Record<DictKey, string>>;
const _check: Complete = dict;
void _check;

export function dictionary(locale: Locale): Record<DictKey, string> {
  return dict[locale];
}
