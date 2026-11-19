/**
 * Site-only texts (not shipped in the app): navigation labels, the facts on the home page and the Terms of Use.
 * `{eula}` in a terms body becomes a link to Apple's Standard EULA; addresses are linkified by gen-site.
 * Facts must stay true to docs/PRIVACY.md and docs/STORE_COMPLIANCE.md. The app is free with no in-app
 * purchases *today*: say "currently", never "forever" (the Pastelki manifest allows paid extras for grown-ups later).
 */
import type { Lang } from '../../src/coloring/types';
import { CONTACT, DEVELOPER } from '../../src/constants/contact';

export const EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export type Section = { heading?: string; body: string };
export type Policy = { title: string; sections: Section[] };

export type SiteText = {
  /** <html lang> / hreflang code. */
  code: string;
  nav: { support: string; privacy: string; terms: string };
  /** Label of the language switcher. */
  language: string;
  /** Short line under the app name on the home page. */
  tagline: string;
  /** Bullet facts on the home page. */
  facts: string[];
  /** Footer line after "© year developer". */
  footer: string;
  /** "Last updated" line of the privacy page. */
  updated: string;
  terms: Policy;
};

const C = CONTACT;
const D = DEVELOPER;
const R = 'github.com/tobob/kolorowanki';

export const SITE: Record<Lang, SiteText> = {
  en: {
    code: 'en',
    nav: { support: 'Support', privacy: 'Privacy', terms: 'Terms' },
    language: 'Language',
    tagline: 'A calm coloring book for children aged 2–6',
    facts: ['No ads', 'No in-app purchases', 'No accounts', 'Works offline', 'No data collected'],
    footer: 'Made with care for small children.',
    updated: 'Last updated: 19 November 2026',
    terms: {
      title: 'Terms of Use',
      sections: [
        { heading: 'Who we are', body: `Kolorowanki is made by ${D}, an independent developer. Contact: ${C}` },
        { heading: 'License', body: 'Kolorowanki is free to download and currently has no in-app purchases. Your use of the app is governed by {eula} for apps downloaded from the App Store, and by the Google Play Terms of Service for apps downloaded from Google Play. These terms only add a few points specific to Kolorowanki.' },
        { heading: 'For children, with a grown-up', body: 'The app is designed for children aged 2–6, ideally with a parent or carer nearby. Settings, information for adults and sharing a picture are behind a parental gate.' },
        { heading: 'What the app does not do', body: 'Kolorowanki shows no ads, needs no account, does not connect to the internet and collects no data. Details are in the Privacy Policy.' },
        { heading: 'Open source', body: `The code of Kolorowanki is open source under the MIT license: ${R}. The pictures, Edyta the sheep and the music come from the Pastelki library, also under the MIT license. Third-party notices, including those for Edyta's synthetic voice, are listed in the repository.` },
        { heading: 'No guarantees', body: 'We do our best to keep the app working well, but it is provided "as is", without guarantees beyond those required by law. Nothing here limits your statutory rights as a consumer.' },
        { heading: 'Changes', body: 'If these terms change, we will update this page and the date above.' },
      ],
    },
  },
  pl: {
    code: 'pl',
    nav: { support: 'Pomoc', privacy: 'Prywatność', terms: 'Warunki' },
    language: 'Język',
    tagline: 'Spokojna kolorowanka dla dzieci w wieku 2–6 lat',
    facts: ['Bez reklam', 'Bez zakupów w aplikacji', 'Bez kont', 'Działa offline', 'Nie zbiera danych'],
    footer: 'Zrobione z myślą o najmłodszych.',
    updated: 'Ostatnia aktualizacja: 19 listopada 2026',
    terms: {
      title: 'Warunki korzystania',
      sections: [
        { heading: 'Kim jesteśmy', body: `Kolorowanki tworzy ${D}, niezależny twórca. Kontakt: ${C}` },
        { heading: 'Licencja', body: 'Kolorowanki można pobrać za darmo i obecnie nie mają zakupów w aplikacji. Korzystanie z aplikacji pobranej z App Store reguluje {eula}, a z aplikacji pobranej z Google Play – Warunki korzystania z usługi Google Play. Te warunki dodają tylko kilka punktów dotyczących samych Kolorowanek.' },
        { heading: 'Dla dzieci, przy dorosłym', body: 'Aplikacja jest przeznaczona dla dzieci w wieku 2–6 lat, najlepiej gdy rodzic lub opiekun jest w pobliżu. Ustawienia, informacje dla dorosłych i udostępnianie obrazka są za bramką rodzicielską.' },
        { heading: 'Czego aplikacja nie robi', body: 'Kolorowanki nie wyświetlają reklam, nie wymagają konta, nie łączą się z internetem i nie zbierają danych. Szczegóły są w Polityce prywatności.' },
        { heading: 'Otwarty kod', body: `Kod Kolorowanek jest otwarty na licencji MIT: ${R}. Obrazki, owca Edyta i muzyka pochodzą z biblioteki Pastelki, również na licencji MIT. Informacje o komponentach innych twórców, także o syntetycznym głosie Edyty, są w repozytorium.` },
        { heading: 'Bez gwarancji', body: 'Dbamy o to, by aplikacja działała dobrze, ale jest udostępniana „taka, jaka jest”, bez gwarancji wykraczających poza wymagane prawem. Nic tutaj nie ogranicza Twoich ustawowych praw jako konsumenta.' },
        { heading: 'Zmiany', body: 'Jeśli te warunki się zmienią, zaktualizujemy tę stronę i datę powyżej.' },
      ],
    },
  },
  de: {
    code: 'de',
    nav: { support: 'Hilfe', privacy: 'Datenschutz', terms: 'Nutzungsbedingungen' },
    language: 'Sprache',
    tagline: 'Ein ruhiges Malbuch für Kinder von 2 bis 6 Jahren',
    facts: ['Keine Werbung', 'Keine In-App-Käufe', 'Kein Konto', 'Funktioniert offline', 'Keine Datenerfassung'],
    footer: 'Mit Sorgfalt für kleine Kinder gemacht.',
    updated: 'Zuletzt aktualisiert: 19. November 2026',
    terms: {
      title: 'Nutzungsbedingungen',
      sections: [
        { heading: 'Wer wir sind', body: `Kolorowanki wird von ${D} entwickelt, einem unabhängigen Entwickler. Kontakt: ${C}` },
        { heading: 'Lizenz', body: 'Kolorowanki ist kostenlos und hat derzeit keine In-App-Käufe. Für die Nutzung der aus dem App Store geladenen App gilt {eula}, für die aus Google Play geladene App die Nutzungsbedingungen von Google Play. Diese Bedingungen ergänzen nur einige Punkte speziell zu Kolorowanki.' },
        { heading: 'Für Kinder, mit einem Erwachsenen', body: 'Die App ist für Kinder von 2 bis 6 Jahren gedacht, am besten mit einem Elternteil oder einer Betreuungsperson in der Nähe. Einstellungen, Informationen für Erwachsene und das Teilen eines Bildes liegen hinter einer Elternsperre.' },
        { heading: 'Was die App nicht tut', body: 'Kolorowanki zeigt keine Werbung, braucht kein Konto, verbindet sich nicht mit dem Internet und erhebt keine Daten. Details stehen in der Datenschutzerklärung.' },
        { heading: 'Open Source', body: `Der Code von Kolorowanki ist Open Source unter der MIT-Lizenz: ${R}. Die Bilder, das Schaf Edyta und die Musik stammen aus der Bibliothek Pastelki, ebenfalls unter der MIT-Lizenz. Hinweise zu Drittkomponenten, auch zu Edytas synthetischer Stimme, stehen im Repository.` },
        { heading: 'Keine Gewähr', body: 'Wir geben uns Mühe, dass die App gut funktioniert, sie wird jedoch „wie besehen“ bereitgestellt, ohne Gewährleistung über das gesetzlich Vorgeschriebene hinaus. Ihre gesetzlichen Verbraucherrechte bleiben unberührt.' },
        { heading: 'Änderungen', body: 'Wenn sich diese Bedingungen ändern, aktualisieren wir diese Seite und das Datum oben.' },
      ],
    },
  },
  fr: {
    code: 'fr',
    nav: { support: 'Aide', privacy: 'Confidentialité', terms: "Conditions d'utilisation" },
    language: 'Langue',
    tagline: 'Un cahier de coloriage tout en douceur pour les enfants de 2 à 6 ans',
    facts: ['Sans publicité', 'Sans achats intégrés', 'Sans compte', 'Fonctionne hors ligne', 'Aucune donnée collectée'],
    footer: 'Fait avec soin pour les tout-petits.',
    updated: 'Dernière mise à jour : 19 novembre 2026',
    terms: {
      title: "Conditions d'utilisation",
      sections: [
        { heading: 'Qui sommes-nous', body: `Kolorowanki est créé par ${D}, un développeur indépendant. Contact : ${C}` },
        { heading: 'Licence', body: "Kolorowanki est gratuit et n'a actuellement aucun achat intégré. L'utilisation de l'app téléchargée sur l'App Store est régie par {eula}, et celle de l'app téléchargée sur Google Play par les Conditions d'utilisation de Google Play. Ces conditions n'ajoutent que quelques points propres à Kolorowanki." },
        { heading: 'Pour les enfants, avec un adulte', body: "L'app est conçue pour les enfants de 2 à 6 ans, idéalement avec un parent ou un adulte à proximité. Les réglages, les informations pour les adultes et le partage d'un dessin sont protégés par un contrôle parental." },
        { heading: "Ce que l'app ne fait pas", body: "Kolorowanki n'affiche aucune publicité, ne demande aucun compte, ne se connecte pas à internet et ne collecte aucune donnée. Les détails figurent dans la politique de confidentialité." },
        { heading: 'Open source', body: `Le code de Kolorowanki est open source sous licence MIT : ${R}. Les dessins, la brebis Edyta et la musique viennent de la bibliothèque Pastelki, elle aussi sous licence MIT. Les mentions des composants tiers, y compris pour la voix de synthèse d'Edyta, figurent dans le dépôt.` },
        { heading: 'Absence de garantie', body: "Nous faisons de notre mieux pour que l'app fonctionne bien, mais elle est fournie « en l'état », sans garantie au-delà de ce que la loi impose. Rien ici ne limite vos droits légaux de consommateur." },
        { heading: 'Modifications', body: 'Si ces conditions changent, nous mettrons à jour cette page et la date ci-dessus.' },
      ],
    },
  },
  es: {
    code: 'es',
    nav: { support: 'Ayuda', privacy: 'Privacidad', terms: 'Condiciones de uso' },
    language: 'Idioma',
    tagline: 'Un libro para colorear tranquilo para niños de 2 a 6 años',
    facts: ['Sin anuncios', 'Sin compras dentro de la app', 'Sin cuentas', 'Funciona sin conexión', 'No recopila datos'],
    footer: 'Hecho con cariño para los más pequeños.',
    updated: 'Última actualización: 19 de noviembre de 2026',
    terms: {
      title: 'Condiciones de uso',
      sections: [
        { heading: 'Quiénes somos', body: `Kolorowanki lo crea ${D}, un desarrollador independiente. Contacto: ${C}` },
        { heading: 'Licencia', body: 'Kolorowanki es gratis y actualmente no tiene compras dentro de la app. El uso de la app descargada del App Store se rige por {eula}, y el de la app descargada de Google Play por las Condiciones de servicio de Google Play. Estas condiciones solo añaden algunos puntos propios de Kolorowanki.' },
        { heading: 'Para niños, con un adulto', body: 'La app está pensada para niños de 2 a 6 años, mejor con una madre, un padre o un adulto cerca. Los ajustes, la información para adultos y compartir un dibujo están detrás de un control parental.' },
        { heading: 'Lo que la app no hace', body: 'Kolorowanki no muestra anuncios, no necesita cuenta, no se conecta a internet y no recopila datos. Los detalles están en la política de privacidad.' },
        { heading: 'Código abierto', body: `El código de Kolorowanki es de código abierto con licencia MIT: ${R}. Los dibujos, la oveja Edyta y la música vienen de la biblioteca Pastelki, también con licencia MIT. Los avisos de componentes de terceros, incluida la voz sintética de Edyta, están en el repositorio.` },
        { heading: 'Sin garantías', body: 'Hacemos lo posible para que la app funcione bien, pero se ofrece «tal cual», sin garantías más allá de las que exige la ley. Nada de esto limita tus derechos legales como consumidor.' },
        { heading: 'Cambios', body: 'Si estas condiciones cambian, actualizaremos esta página y la fecha de arriba.' },
      ],
    },
  },
  it: {
    code: 'it',
    nav: { support: 'Assistenza', privacy: 'Privacy', terms: "Condizioni d'uso" },
    language: 'Lingua',
    tagline: 'Un album da colorare tranquillo per bambini dai 2 ai 6 anni',
    facts: ['Niente pubblicità', 'Niente acquisti in-app', 'Nessun account', 'Funziona offline', 'Nessun dato raccolto'],
    footer: 'Fatto con cura per i più piccoli.',
    updated: 'Ultimo aggiornamento: 19 novembre 2026',
    terms: {
      title: "Condizioni d'uso",
      sections: [
        { heading: 'Chi siamo', body: `Kolorowanki è creato da ${D}, uno sviluppatore indipendente. Contatto: ${C}` },
        { heading: 'Licenza', body: "Kolorowanki è gratuito e al momento non ha acquisti in-app. L'uso dell'app scaricata dall'App Store è regolato da {eula}, quello dell'app scaricata da Google Play dai Termini di servizio di Google Play. Queste condizioni aggiungono solo alcuni punti specifici di Kolorowanki." },
        { heading: 'Per bambini, con un adulto', body: "L'app è pensata per bambini dai 2 ai 6 anni, meglio se con un genitore o un adulto vicino. Le impostazioni, le informazioni per gli adulti e la condivisione di un disegno sono protette da un controllo parentale." },
        { heading: "Cosa non fa l'app", body: "Kolorowanki non mostra pubblicità, non richiede account, non si collega a internet e non raccoglie dati. I dettagli sono nell'informativa sulla privacy." },
        { heading: 'Open source', body: `Il codice di Kolorowanki è open source con licenza MIT: ${R}. I disegni, la pecora Edyta e la musica provengono dalla libreria Pastelki, anch'essa con licenza MIT. Le note sui componenti di terze parti, anche sulla voce sintetica di Edyta, sono nel repository.` },
        { heading: 'Nessuna garanzia', body: "Facciamo del nostro meglio perché l'app funzioni bene, ma è fornita «così com'è», senza garanzie oltre quelle previste dalla legge. Nulla qui limita i tuoi diritti di consumatore previsti dalla legge." },
        { heading: 'Modifiche', body: 'Se queste condizioni cambiano, aggiorneremo questa pagina e la data qui sopra.' },
      ],
    },
  },
  pt: {
    code: 'pt',
    nav: { support: 'Ajuda', privacy: 'Privacidade', terms: 'Termos de uso' },
    language: 'Idioma',
    tagline: 'Um livro de colorir tranquilo para crianças de 2 a 6 anos',
    facts: ['Sem anúncios', 'Sem compras no app', 'Sem contas', 'Funciona offline', 'Não coleta dados'],
    footer: 'Feito com carinho para os pequenos.',
    updated: 'Última atualização: 19 de novembro de 2026',
    terms: {
      title: 'Termos de uso',
      sections: [
        { heading: 'Quem somos', body: `O Kolorowanki é criado por ${D}, um desenvolvedor independente. Contato: ${C}` },
        { heading: 'Licença', body: 'O Kolorowanki é gratuito e no momento não tem compras no app. O uso do app baixado da App Store é regido pelo {eula}, e o do app baixado do Google Play pelos Termos de Serviço do Google Play. Estes termos apenas acrescentam alguns pontos específicos do Kolorowanki.' },
        { heading: 'Para crianças, com um adulto', body: 'O app foi pensado para crianças de 2 a 6 anos, de preferência com um pai, mãe ou responsável por perto. Os ajustes, as informações para adultos e compartilhar um desenho ficam atrás de um controle parental.' },
        { heading: 'O que o app não faz', body: 'O Kolorowanki não mostra anúncios, não precisa de conta, não se conecta à internet e não coleta dados. Os detalhes estão na política de privacidade.' },
        { heading: 'Código aberto', body: `O código do Kolorowanki é aberto, sob a licença MIT: ${R}. Os desenhos, a ovelha Edyta e a música vêm da biblioteca Pastelki, também sob a licença MIT. Os avisos de componentes de terceiros, inclusive sobre a voz sintética da Edyta, estão no repositório.` },
        { heading: 'Sem garantias', body: 'Fazemos o possível para que o app funcione bem, mas ele é fornecido "como está", sem garantias além das exigidas por lei. Nada aqui limita seus direitos legais de consumidor.' },
        { heading: 'Alterações', body: 'Se estes termos mudarem, atualizaremos esta página e a data acima.' },
      ],
    },
  },
  nl: {
    code: 'nl',
    nav: { support: 'Hulp', privacy: 'Privacy', terms: 'Gebruiksvoorwaarden' },
    language: 'Taal',
    tagline: 'Een rustig kleurboek voor kinderen van 2 tot 6 jaar',
    facts: ['Geen reclame', 'Geen in-app-aankopen', 'Geen account', 'Werkt offline', 'Verzamelt geen gegevens'],
    footer: 'Met zorg gemaakt voor kleine kinderen.',
    updated: 'Laatst bijgewerkt: 19 november 2026',
    terms: {
      title: 'Gebruiksvoorwaarden',
      sections: [
        { heading: 'Wie we zijn', body: `Kolorowanki wordt gemaakt door ${D}, een onafhankelijke ontwikkelaar. Contact: ${C}` },
        { heading: 'Licentie', body: 'Kolorowanki is gratis en heeft op dit moment geen in-app-aankopen. Voor het gebruik van de app uit de App Store geldt {eula}, voor de app uit Google Play de Servicevoorwaarden van Google Play. Deze voorwaarden voegen alleen een paar punten toe die specifiek over Kolorowanki gaan.' },
        { heading: 'Voor kinderen, met een volwassene', body: 'De app is bedoeld voor kinderen van 2 tot 6 jaar, het liefst met een ouder of verzorger in de buurt. Instellingen, informatie voor volwassenen en een tekening delen zitten achter een ouderslot.' },
        { heading: 'Wat de app niet doet', body: 'Kolorowanki toont geen reclame, heeft geen account nodig, maakt geen verbinding met internet en verzamelt geen gegevens. Details staan in het privacybeleid.' },
        { heading: 'Open source', body: `De code van Kolorowanki is open source onder de MIT-licentie: ${R}. De tekeningen, schaap Edyta en de muziek komen uit de bibliotheek Pastelki, ook onder de MIT-licentie. Vermeldingen van onderdelen van derden, ook over Edyta’s synthetische stem, staan in de repository.` },
        { heading: 'Geen garantie', body: 'We doen ons best om de app goed te laten werken, maar hij wordt geleverd "zoals hij is", zonder garanties buiten wat de wet vereist. Niets hier beperkt je wettelijke rechten als consument.' },
        { heading: 'Wijzigingen', body: 'Als deze voorwaarden veranderen, werken we deze pagina en de datum hierboven bij.' },
      ],
    },
  },
  uk: {
    code: 'uk',
    nav: { support: 'Допомога', privacy: 'Конфіденційність', terms: 'Умови' },
    language: 'Мова',
    tagline: 'Спокійна розмальовка для дітей 2–6 років',
    facts: ['Без реклами', 'Без покупок у застосунку', 'Без облікових записів', 'Працює офлайн', 'Не збирає даних'],
    footer: 'Зроблено з турботою про малюків.',
    updated: 'Останнє оновлення: 19 листопада 2026 р.',
    terms: {
      title: 'Умови використання',
      sections: [
        { heading: 'Хто ми', body: `Kolorowanki створює ${D}, незалежний розробник. Контакт: ${C}` },
        { heading: 'Ліцензія', body: 'Kolorowanki можна завантажити безкоштовно, і зараз у застосунку немає покупок. Використання застосунку з App Store регулює {eula}, а застосунку з Google Play – Умови використання Google Play. Ці умови лише додають кілька пунктів, що стосуються самого Kolorowanki.' },
        { heading: 'Для дітей, поруч із дорослим', body: 'Застосунок призначений для дітей 2–6 років, найкраще, коли поруч є батьки або опікун. Налаштування, інформація для дорослих і поширення малюнка захищені батьківським бар’єром.' },
        { heading: 'Чого застосунок не робить', body: 'Kolorowanki не показує реклами, не потребує облікового запису, не підключається до інтернету й не збирає даних. Подробиці – в Політиці конфіденційності.' },
        { heading: 'Відкритий код', body: `Код Kolorowanki відкритий за ліцензією MIT: ${R}. Малюнки, овечка Едита й музика походять із бібліотеки Pastelki, теж за ліцензією MIT. Відомості про сторонні компоненти, зокрема про синтетичний голос Едити, є в репозиторії.` },
        { heading: 'Без гарантій', body: 'Ми дбаємо, щоб застосунок працював добре, але він надається «як є», без гарантій понад ті, що вимагає закон. Ніщо тут не обмежує ваших законних прав споживача.' },
        { heading: 'Зміни', body: 'Якщо ці умови зміняться, ми оновимо цю сторінку й дату вище.' },
      ],
    },
  },
  cs: {
    code: 'cs',
    nav: { support: 'Pomoc', privacy: 'Soukromí', terms: 'Podmínky' },
    language: 'Jazyk',
    tagline: 'Klidné omalovánky pro děti od 2 do 6 let',
    facts: ['Bez reklam', 'Bez nákupů v aplikaci', 'Bez účtů', 'Funguje offline', 'Nesbírá data'],
    footer: 'Vytvořeno s péčí pro malé děti.',
    updated: 'Naposledy aktualizováno: 19. listopadu 2026',
    terms: {
      title: 'Podmínky používání',
      sections: [
        { heading: 'Kdo jsme', body: `Kolorowanki vytváří ${D}, nezávislý vývojář. Kontakt: ${C}` },
        { heading: 'Licence', body: 'Kolorowanki jsou zdarma a v současnosti nemají žádné nákupy v aplikaci. Používání aplikace stažené z App Store se řídí dokumentem {eula}, aplikace stažené z Google Play Smluvními podmínkami služby Google Play. Tyto podmínky jen doplňují několik bodů týkajících se Kolorowanek.' },
        { heading: 'Pro děti, s dospělým', body: 'Aplikace je určena dětem od 2 do 6 let, nejlépe s rodičem nebo jinou dospělou osobou nablízku. Nastavení, informace pro dospělé a sdílení obrázku jsou za rodičovským zámkem.' },
        { heading: 'Co aplikace nedělá', body: 'Kolorowanki nezobrazují reklamy, nevyžadují účet, nepřipojují se k internetu a nesbírají žádná data. Podrobnosti najdete v zásadách ochrany soukromí.' },
        { heading: 'Otevřený kód', body: `Kód Kolorowanek je otevřený pod licencí MIT: ${R}. Obrázky, ovečka Edyta a hudba pocházejí z knihovny Pastelki, rovněž pod licencí MIT. Informace o komponentách třetích stran, i o syntetickém hlasu Edyty, jsou v repozitáři.` },
        { heading: 'Bez záruk', body: 'Snažíme se, aby aplikace fungovala dobře, ale poskytuje se „tak, jak je“, bez záruk nad rámec zákona. Nic z toho neomezuje vaše zákonná práva spotřebitele.' },
        { heading: 'Změny', body: 'Pokud se tyto podmínky změní, aktualizujeme tuto stránku a datum výše.' },
      ],
    },
  },
  sk: {
    code: 'sk',
    nav: { support: 'Pomoc', privacy: 'Súkromie', terms: 'Podmienky' },
    language: 'Jazyk',
    tagline: 'Pokojné omaľovánky pre deti od 2 do 6 rokov',
    facts: ['Bez reklám', 'Bez nákupov v aplikácii', 'Bez účtov', 'Funguje offline', 'Nezbiera údaje'],
    footer: 'Vytvorené s láskou pre malé deti.',
    updated: 'Naposledy aktualizované: 19. novembra 2026',
    terms: {
      title: 'Podmienky používania',
      sections: [
        { heading: 'Kto sme', body: `Kolorowanki vytvára ${D}, nezávislý vývojár. Kontakt: ${C}` },
        { heading: 'Licencia', body: 'Kolorowanki sú zadarmo a v súčasnosti nemajú žiadne nákupy v aplikácii. Používanie aplikácie stiahnutej z App Store sa riadi dokumentom {eula}, aplikácie stiahnutej z Google Play Zmluvnými podmienkami služby Google Play. Tieto podmienky len dopĺňajú niekoľko bodov týkajúcich sa Kolorowanek.' },
        { heading: 'Pre deti, s dospelým', body: 'Aplikácia je určená deťom od 2 do 6 rokov, najlepšie s rodičom alebo inou dospelou osobou nablízku. Nastavenia, informácie pre dospelých a zdieľanie obrázka sú za rodičovskou zámkou.' },
        { heading: 'Čo aplikácia nerobí', body: 'Kolorowanki nezobrazujú reklamy, nevyžadujú účet, nepripájajú sa na internet a nezbierajú žiadne údaje. Podrobnosti nájdete v zásadách ochrany súkromia.' },
        { heading: 'Otvorený kód', body: `Kód Kolorowanek je otvorený pod licenciou MIT: ${R}. Obrázky, ovečka Edyta a hudba pochádzajú z knižnice Pastelki, tiež pod licenciou MIT. Informácie o komponentoch tretích strán, aj o syntetickom hlase Edyty, sú v repozitári.` },
        { heading: 'Bez záruk', body: 'Snažíme sa, aby aplikácia fungovala dobre, ale poskytuje sa „tak, ako je“, bez záruk nad rámec zákona. Nič z toho neobmedzuje vaše zákonné práva spotrebiteľa.' },
        { heading: 'Zmeny', body: 'Ak sa tieto podmienky zmenia, aktualizujeme túto stránku a dátum vyššie.' },
      ],
    },
  },
  sv: {
    code: 'sv',
    nav: { support: 'Hjälp', privacy: 'Integritet', terms: 'Villkor' },
    language: 'Språk',
    tagline: 'En lugn målarbok för barn 2–6 år',
    facts: ['Ingen reklam', 'Inga köp i appen', 'Inga konton', 'Fungerar offline', 'Samlar inte in data'],
    footer: 'Gjord med omsorg för små barn.',
    updated: 'Senast uppdaterad: 19 november 2026',
    terms: {
      title: 'Användarvillkor',
      sections: [
        { heading: 'Vilka vi är', body: `Kolorowanki görs av ${D}, en oberoende utvecklare. Kontakt: ${C}` },
        { heading: 'Licens', body: 'Kolorowanki är gratis och har för närvarande inga köp i appen. Användningen av appen från App Store regleras av {eula}, och av appen från Google Play av Google Plays användarvillkor. De här villkoren lägger bara till några punkter som gäller Kolorowanki.' },
        { heading: 'För barn, med en vuxen', body: 'Appen är gjord för barn 2–6 år, helst med en förälder eller annan vuxen i närheten. Inställningar, information för vuxna och att dela en bild finns bakom ett föräldralås.' },
        { heading: 'Vad appen inte gör', body: 'Kolorowanki visar ingen reklam, kräver inget konto, ansluter inte till internet och samlar inte in några data. Detaljer finns i integritetspolicyn.' },
        { heading: 'Öppen källkod', body: `Koden till Kolorowanki är öppen källkod under MIT-licensen: ${R}. Bilderna, fåret Edyta och musiken kommer från biblioteket Pastelki, också under MIT-licensen. Information om tredjepartskomponenter, även om Edytas syntetiska röst, finns i repot.` },
        { heading: 'Inga garantier', body: 'Vi gör vårt bästa för att appen ska fungera bra, men den tillhandahålls ”i befintligt skick”, utan garantier utöver vad lagen kräver. Inget här begränsar dina lagstadgade rättigheter som konsument.' },
        { heading: 'Ändringar', body: 'Om villkoren ändras uppdaterar vi den här sidan och datumet ovan.' },
      ],
    },
  },
  ro: {
    code: 'ro',
    nav: { support: 'Ajutor', privacy: 'Confidențialitate', terms: 'Condiții' },
    language: 'Limba',
    tagline: 'O carte de colorat liniștită pentru copii de 2–6 ani',
    facts: ['Fără reclame', 'Fără achiziții în aplicație', 'Fără conturi', 'Funcționează offline', 'Nu colectează date'],
    footer: 'Făcută cu grijă pentru cei mici.',
    updated: 'Ultima actualizare: 19 noiembrie 2026',
    terms: {
      title: 'Condiții de utilizare',
      sections: [
        { heading: 'Cine suntem', body: `Kolorowanki este creată de ${D}, un dezvoltator independent. Contact: ${C}` },
        { heading: 'Licență', body: 'Kolorowanki este gratuită și în prezent nu are achiziții în aplicație. Utilizarea aplicației descărcate din App Store este guvernată de {eula}, iar a celei descărcate din Google Play de Termenii și condițiile Google Play. Aceste condiții adaugă doar câteva puncte specifice Kolorowanki.' },
        { heading: 'Pentru copii, cu un adult', body: 'Aplicația este gândită pentru copii de 2–6 ani, ideal cu un părinte sau un adult în apropiere. Setările, informațiile pentru adulți și distribuirea unui desen sunt protejate de o barieră parentală.' },
        { heading: 'Ce nu face aplicația', body: 'Kolorowanki nu afișează reclame, nu cere cont, nu se conectează la internet și nu colectează date. Detaliile sunt în Politica de confidențialitate.' },
        { heading: 'Cod deschis', body: `Codul Kolorowanki este open source, sub licența MIT: ${R}. Desenele, oița Edyta și muzica vin din biblioteca Pastelki, tot sub licența MIT. Mențiunile despre componentele terțe, inclusiv despre vocea sintetică a Edytei, se află în repository.` },
        { heading: 'Fără garanții', body: 'Facem tot posibilul ca aplicația să funcționeze bine, dar este oferită „ca atare”, fără garanții în afara celor cerute de lege. Nimic de aici nu vă limitează drepturile legale de consumator.' },
        { heading: 'Modificări', body: 'Dacă aceste condiții se schimbă, vom actualiza această pagină și data de mai sus.' },
      ],
    },
  },
  hu: {
    code: 'hu',
    nav: { support: 'Súgó', privacy: 'Adatvédelem', terms: 'Feltételek' },
    language: 'Nyelv',
    tagline: 'Nyugodt kifestő 2–6 éves gyerekeknek',
    facts: ['Nincs reklám', 'Nincs alkalmazáson belüli vásárlás', 'Nincs fiók', 'Offline működik', 'Nem gyűjt adatot'],
    footer: 'Gondossággal készült a legkisebbeknek.',
    updated: 'Utolsó frissítés: 2026. november 19.',
    terms: {
      title: 'Felhasználási feltételek',
      sections: [
        { heading: 'Kik vagyunk', body: `A Kolorowanki-t ${D}, egy független fejlesztő készíti. Kapcsolat: ${C}` },
        { heading: 'Licenc', body: 'A Kolorowanki ingyenes, és jelenleg nincs benne alkalmazáson belüli vásárlás. Az App Store-ból letöltött alkalmazás használatára {eula} vonatkozik, a Google Playről letöltöttére a Google Play Szolgáltatási feltételei. Ezek a feltételek csak néhány, a Kolorowanki-ra vonatkozó pontot tesznek hozzá.' },
        { heading: 'Gyerekeknek, felnőtt mellett', body: 'Az alkalmazás 2–6 éves gyerekeknek készült, legjobb, ha a közelben van egy szülő vagy gondozó. A beállítások, a felnőtteknek szóló információk és a kép megosztása szülői zár mögött vannak.' },
        { heading: 'Amit az alkalmazás nem csinál', body: 'A Kolorowanki nem mutat reklámot, nem kér fiókot, nem csatlakozik az internethez, és nem gyűjt adatot. A részletek az adatvédelmi tájékoztatóban vannak.' },
        { heading: 'Nyílt forráskód', body: `A Kolorowanki kódja nyílt forráskódú, MIT-licenc alatt: ${R}. A képek, Edyta, a bárány és a zene a Pastelki könyvtárból származnak, szintén MIT-licenc alatt. A külső összetevőkről, Edyta szintetikus hangjáról is, a tárolóban van tájékoztatás.` },
        { heading: 'Garancia nélkül', body: 'Igyekszünk, hogy az alkalmazás jól működjön, de „ahogy van” alapon érhető el, a törvény által előírtnál több garancia nélkül. Ez semmiben nem korlátozza a fogyasztói jogaidat.' },
        { heading: 'Változások', body: 'Ha ezek a feltételek változnak, frissítjük ezt az oldalt és a fenti dátumot.' },
      ],
    },
  },
  tr: {
    code: 'tr',
    nav: { support: 'Yardım', privacy: 'Gizlilik', terms: 'Koşullar' },
    language: 'Dil',
    tagline: '2–6 yaş çocuklar için sakin bir boyama kitabı',
    facts: ['Reklam yok', 'Uygulama içi satın alma yok', 'Hesap yok', 'Çevrimdışı çalışır', 'Veri toplamaz'],
    footer: 'Küçük çocuklar için özenle yapıldı.',
    updated: 'Son güncelleme: 19 Kasım 2026',
    terms: {
      title: 'Kullanım Koşulları',
      sections: [
        { heading: 'Biz kimiz', body: `Kolorowanki, bağımsız bir geliştirici olan ${D} tarafından yapılır. İletişim: ${C}` },
        { heading: 'Lisans', body: "Kolorowanki ücretsizdir ve şu anda uygulama içi satın alma içermez. App Store'dan indirilen uygulamanın kullanımı {eula} ile, Google Play'den indirilen uygulamanınki Google Play Hizmet Şartları ile düzenlenir. Bu koşullar yalnızca Kolorowanki'ye özgü birkaç madde ekler." },
        { heading: 'Çocuklar için, bir büyükle', body: 'Uygulama 2–6 yaş çocuklar için tasarlanmıştır; en iyisi yakında bir ebeveyn ya da bakıcı olmasıdır. Ayarlar, büyüklere yönelik bilgiler ve bir resmi paylaşma ebeveyn kilidinin arkasındadır.' },
        { heading: 'Uygulamanın yapmadıkları', body: 'Kolorowanki reklam göstermez, hesap istemez, internete bağlanmaz ve veri toplamaz. Ayrıntılar Gizlilik Politikası’ndadır.' },
        { heading: 'Açık kaynak', body: `Kolorowanki’nin kodu MIT lisansıyla açık kaynaktır: ${R}. Resimler, koyun Edyta ve müzik Pastelki kütüphanesinden gelir; onlar da MIT lisanslıdır. Edyta’nın sentetik sesi dahil üçüncü taraf bileşenlerle ilgili bilgiler depoda yer alır.` },
        { heading: 'Garanti yok', body: 'Uygulamanın iyi çalışması için elimizden geleni yapıyoruz, ancak uygulama yasaların gerektirdiğinin ötesinde bir garanti olmadan “olduğu gibi” sunulur. Buradaki hiçbir şey tüketici olarak yasal haklarınızı sınırlamaz.' },
        { heading: 'Değişiklikler', body: 'Bu koşullar değişirse bu sayfayı ve yukarıdaki tarihi güncelleriz.' },
      ],
    },
  },
  ja: {
    code: 'ja',
    nav: { support: 'サポート', privacy: 'プライバシー', terms: '利用規約' },
    language: '言語',
    tagline: '2〜6歳の子どものための、おだやかなぬりえ',
    facts: ['広告なし', 'アプリ内課金なし', 'アカウント不要', 'オフラインで動作', 'データを収集しません'],
    footer: '小さな子どもたちのために、心をこめて。',
    updated: '最終更新日：2026年11月19日',
    terms: {
      title: '利用規約',
      sections: [
        { heading: '私たちについて', body: `Kolorowanki は個人開発者 ${D} が制作しています。連絡先：${C}` },
        { heading: 'ライセンス', body: 'Kolorowanki は無料でダウンロードでき、現在アプリ内課金はありません。App Store からダウンロードしたアプリの利用には{eula}が、Google Play からダウンロードしたアプリには Google Play 利用規約が適用されます。この規約は Kolorowanki に固有のいくつかの点を補足するものです。' },
        { heading: '子ども向け、大人と一緒に', body: 'このアプリは2〜6歳の子ども向けで、保護者などの大人がそばにいるのが理想です。設定、大人向けの情報、絵の共有は保護者向けのロックの先にあります。' },
        { heading: 'アプリがしないこと', body: 'Kolorowanki は広告を表示せず、アカウントを必要とせず、インターネットに接続せず、データを収集しません。詳しくはプライバシーポリシーをご覧ください。' },
        { heading: 'オープンソース', body: `Kolorowanki のコードは MIT ライセンスのオープンソースです：${R}。絵、ひつじのエディタ、音楽は Pastelki ライブラリのもので、こちらも MIT ライセンスです。エディタの合成音声を含む第三者コンポーネントの表示はリポジトリにあります。` },
        { heading: '保証の否認', body: 'アプリが快適に動くよう努めていますが、法律で求められる範囲を超える保証はなく「現状のまま」提供されます。ここに書かれたことは、消費者としての法的な権利を制限するものではありません。' },
        { heading: '変更', body: 'この規約が変わる場合は、このページと上の日付を更新します。' },
      ],
    },
  },
  zh: {
    code: 'zh-Hans',
    nav: { support: '帮助', privacy: '隐私', terms: '使用条款' },
    language: '语言',
    tagline: '为2到6岁孩子设计的安静涂色书',
    facts: ['无广告', '无应用内购买', '无需账户', '离线可用', '不收集数据'],
    footer: '用心为小朋友制作。',
    updated: '最后更新：2026年11月19日',
    terms: {
      title: '使用条款',
      sections: [
        { heading: '我们是谁', body: `Kolorowanki 由独立开发者 ${D} 制作。联系方式：${C}` },
        { heading: '许可', body: 'Kolorowanki 可免费下载，目前没有应用内购买。从 App Store 下载的应用受{eula}约束，从 Google Play 下载的应用受 Google Play 服务条款约束。本条款只补充几条与 Kolorowanki 相关的内容。' },
        { heading: '为孩子设计，有大人陪伴', body: '本应用为2到6岁的孩子设计，最好有家长或看护人在身边。设置、给大人的信息以及分享图画都在家长门槛之后。' },
        { heading: '应用不会做的事', body: 'Kolorowanki 不显示广告，不需要账户，不连接互联网，也不收集任何数据。详情请见隐私政策。' },
        { heading: '开源', body: `Kolorowanki 的代码以 MIT 许可开源：${R}。图画、小羊伊迪塔和音乐来自 Pastelki 图库，同样采用 MIT 许可。第三方组件说明（包括伊迪塔的合成语音）列在代码仓库中。` },
        { heading: '无担保', body: '我们尽力让应用正常运行，但它按“原样”提供，除法律要求外不作任何担保。本条款不限制你作为消费者的法定权利。' },
        { heading: '变更', body: '如果本条款有变化，我们会更新此页面和上方的日期。' },
      ],
    },
  },
};

/** How the {eula} placeholder reads in each language. */
export const EULA_NAME: Record<Lang, string> = {
  en: "Apple's Standard Licensed Application End User License Agreement (EULA)",
  pl: 'standardowa umowa licencyjna Apple dla użytkownika końcowego (EULA)',
  de: 'der Standard-Endbenutzer-Lizenzvertrag (EULA) von Apple',
  fr: "le contrat de licence standard d'Apple pour l'utilisateur final (EULA)",
  es: 'el contrato de licencia estándar de Apple para el usuario final (EULA)',
  it: "il contratto di licenza standard di Apple per l'utente finale (EULA)",
  pt: 'Contrato de Licença de Usuário Final padrão da Apple (EULA)',
  nl: 'de standaard licentieovereenkomst voor eindgebruikers (EULA) van Apple',
  uk: 'стандартна ліцензійна угода Apple з кінцевим користувачем (EULA)',
  cs: 'Standardní licenční smlouva Apple s koncovým uživatelem (EULA)',
  sk: 'Štandardná licenčná zmluva Apple s koncovým používateľom (EULA)',
  sv: 'Apples standardlicensavtal för slutanvändare (EULA)',
  ro: 'Acordul de licență standard Apple pentru utilizatorul final (EULA)',
  hu: 'az Apple szabványos végfelhasználói licencszerződése (EULA)',
  tr: "Apple'ın Standart Son Kullanıcı Lisans Sözleşmesi (EULA)",
  ja: 'Apple の標準使用許諾契約（EULA）',
  zh: 'Apple 标准最终用户许可协议（EULA）',
};
