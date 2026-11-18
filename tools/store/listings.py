#!/usr/bin/env python3
"""
Store listing copy for all 17 app languages -> store.config.json (App Store, EAS Metadata)
and docs/store/GOOGLE_PLAY.md (Google Play, pasted by hand). Run: python3 tools/store/listings.py
Limits are checked: App Store name/subtitle <= 30 chars, keywords <= 100 bytes, promo <= 170;
Play title <= 30, short description <= 80, full description <= 4000.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
REPO_LINE = "Kolorowanki is open source: github.com/tobob/kolorowanki"
SITE_URL = "https://tobob.github.io/kolorowanki-site/"
SUPPORT_URL = SITE_URL
PRIVACY_URL = SITE_URL + "privacy/"
MARKETING_URL = "https://github.com/tobob/kolorowanki"
# Languages the site (tools/site/gen-site.ts) has; English lives at the root.
SITE_LANGS = {"pl", "en", "de", "fr", "es", "it", "pt", "nl", "uk", "cs", "sk", "sv", "ro", "hu", "tr", "ja", "zh"}


def site_url(key, page=""):
    """Site page in the listing's language (store key like "pt-BR" -> /pt/), English at the root."""
    lang = key.split("-")[0]
    prefix = "" if lang == "en" or lang not in SITE_LANGS else lang + "/"
    return SITE_URL + prefix + page

# Each language: name, subtitle, keywords, promo, short (Play), and body sections.
# body = (intro, how, inside_title, inside[], calm_title, calm, parents_title, parents[], credit)
L = {}

L["en"] = dict(
    name="Kolorowanki – Calm Coloring",
    subtitle="Gentle pages for little ones",
    keywords="kids,toddler,preschool,coloring book,color,paint,drawing,animals,offline,no ads,calm,learning",
    promo="A calm coloring book for children aged 2 to 6. Hold, pick a soft color, tap to fill. No ads, no purchases, no internet and no data collected.",
    short="A calm coloring book for kids aged 2 to 6. Offline, no ads, no tricks.",
    intro="Kolorowanki is a calm coloring book for children aged 2 to 6.",
    how="Hold a finger on the picture and a ring of seven soft colors appears. Tap one and that part of the picture fills with color. A quick tap uses the same color again. Pinch to zoom in on small parts, and undo if you change your mind. Every page saves by itself, so a picture can wait for tomorrow.",
    inside_title="WHAT'S INSIDE",
    inside=[
        "Four kinds of pages, from easy to busy: one big picture, a few friends, a little scene and a full page.",
        "Animals, food, toys and everyday things, drawn in a gentle, friendly style.",
        "Seven soft colors chosen for each page.",
    ],
    calm_title="CALM BY DESIGN",
    calm="No timers, no scores, no streaks and no rewards for playing longer. Nothing flashes and nothing is loud. There is no wrong way to color.",
    parents_title="FOR PARENTS",
    parents=[
        "No ads and no in-app purchases.",
        "Works fully offline.",
        "We collect no data. Colorings stay on the device.",
        "Settings and the privacy policy are behind a parental gate. There you can pick one of 17 languages or start all pages again.",
        'A grown-up can save a finished picture to Photos or share it, behind the parental gate. The app never reads your photo library.',
    ],
    credit="The pictures come from Pastelki, a free library of gentle illustrations for small children.",
)

L["en-GB"] = dict(
    L["en"],
    name="Kolorowanki – Calm Colouring",
    keywords="kids,toddler,nursery,preschool,colouring book,colour,paint,drawing,animals,offline,no ads,calm",
    promo="A calm colouring book for children aged 2 to 6. Hold, pick a soft colour, tap to fill. No ads, no purchases, no internet and no data collected.",
    short="A calm colouring book for kids aged 2 to 6. Offline, no ads, no tricks.",
    intro="Kolorowanki is a calm colouring book for children aged 2 to 6.",
    how="Hold a finger on the picture and a ring of seven soft colours appears. Tap one and that part of the picture fills with colour. A quick tap uses the same colour again. Pinch to zoom in on small parts, and undo if you change your mind. Every page saves by itself, so a picture can wait for tomorrow.",
    inside=[
        "Four kinds of pages, from easy to busy: one big picture, a few friends, a little scene and a full page.",
        "Animals, food, toys and everyday things, drawn in a gentle, friendly style.",
        "Seven soft colours chosen for each page.",
    ],
    calm="No timers, no scores, no streaks and no rewards for playing longer. Nothing flashes and nothing is loud. There is no wrong way to colour.",
    parents=[
        "No ads and no in-app purchases.",
        "Works fully offline.",
        "We collect no data. Colourings stay on the device.",
        "Settings and the privacy policy are behind a parental gate. There you can pick one of 17 languages or start all pages again.",
        'A grown-up can save a finished picture to Photos or share it, behind the parental gate. The app never reads your photo library.',
    ],
)

L["pl"] = dict(
    name="Kolorowanki – dla maluchów",
    subtitle="Spokojne kolorowanie od 2 lat",
    keywords="dzieci,przedszkolak,malowanie,kolory,rysowanie,zwierzęta,obrazki,offline,bez reklam,pastelki",
    promo="Spokojna kolorowanka dla dzieci od 2 do 6 lat. Przytrzymaj, wybierz miękki kolor, stuknij. Bez reklam, zakupów i internetu. Nie zbieramy danych.",
    short="Spokojna kolorowanka dla dzieci od 2 do 6 lat. Offline, bez reklam i sztuczek.",
    intro="Kolorowanki to spokojna kolorowanka dla dzieci w wieku od 2 do 6 lat.",
    how="Przytrzymaj palec na obrazku, a dookoła pojawi się siedem miękkich kolorów. Stuknij w jeden, a ta część obrazka się wypełni. Szybkie stuknięcie używa znowu tego samego koloru. Dwoma palcami możesz powiększyć małe fragmenty, a jeśli się rozmyślisz, cofnąć ruch. Każda strona zapisuje się sama, więc obrazek może poczekać do jutra.",
    inside_title="CO JEST W ŚRODKU",
    inside=[
        "Cztery rodzaje stron, od łatwych do pełnych: jeden duży obrazek, kilku przyjaciół, mała scenka i pełna strona.",
        "Zwierzęta, jedzenie, zabawki i rzeczy z codzienności, narysowane łagodnie i przyjaźnie.",
        "Siedem miękkich kolorów dobranych do każdej strony.",
    ],
    calm_title="SPOKOJNIE, BEZ POŚPIECHU",
    calm="Nie ma limitu czasu, punktów, serii ani nagród za dłuższą zabawę. Nic nie miga i nic nie jest głośne. Nie da się pokolorować źle.",
    parents_title="DLA RODZICÓW",
    parents=[
        "Bez reklam i bez zakupów w aplikacji.",
        "Działa całkowicie offline.",
        "Nie zbieramy żadnych danych. Kolorowanki zostają na urządzeniu.",
        "Ustawienia i polityka prywatności są za bramką rodzicielską. Możesz tam wybrać jeden z 17 języków albo zacząć wszystkie strony od nowa.",
        'Dorosły może zapisać gotowy obrazek w Zdjęciach albo go udostępnić, za bramką rodzicielską. Aplikacja nigdy nie czyta biblioteki zdjęć.',
    ],
    credit="Obrazki pochodzą z Pastelek, darmowej biblioteki łagodnych ilustracji dla małych dzieci.",
)

L["de"] = dict(
    name="Kolorowanki – Ausmalbilder",
    subtitle="Ruhiges Malen für die Kleinen",
    keywords="kinder,kleinkind,kita,malbuch,malen,farben,zeichnen,tiere,offline,ohne werbung,ruhig,ab 2",
    promo="Ein ruhiges Malbuch für Kinder von 2 bis 6 Jahren. Halten, eine sanfte Farbe wählen, tippen. Keine Werbung, keine Käufe, kein Internet, keine Daten.",
    short="Ein ruhiges Malbuch für Kinder von 2 bis 6. Offline, ohne Werbung und Tricks.",
    intro="Kolorowanki ist ein ruhiges Malbuch für Kinder von 2 bis 6 Jahren.",
    how="Halte einen Finger auf das Bild, und rundherum erscheinen sieben sanfte Farben. Tippe eine an, und dieser Teil des Bildes wird ausgemalt. Ein kurzes Tippen nimmt wieder dieselbe Farbe. Mit zwei Fingern vergrößerst du kleine Stellen, und du kannst jeden Schritt rückgängig machen. Jede Seite speichert sich von selbst, so kann ein Bild bis morgen warten.",
    inside_title="WAS IST DRIN",
    inside=[
        "Vier Arten von Seiten, von leicht bis voll: ein großes Bild, ein paar Freunde, eine kleine Szene und eine volle Seite.",
        "Tiere, Essen, Spielsachen und Dinge aus dem Alltag, sanft und freundlich gezeichnet.",
        "Sieben sanfte Farben, passend zu jeder Seite.",
    ],
    calm_title="RUHIG GESTALTET",
    calm="Keine Zeitlimits, keine Punkte, keine Serien und keine Belohnungen fürs längere Spielen. Nichts blinkt und nichts ist laut. Man kann nichts falsch ausmalen.",
    parents_title="FÜR ELTERN",
    parents=[
        "Keine Werbung und keine In-App-Käufe.",
        "Funktioniert komplett offline.",
        "Wir erheben keine Daten. Die Bilder bleiben auf dem Gerät.",
        "Einstellungen und Datenschutzerklärung liegen hinter einer Elternsperre. Dort lässt sich eine von 17 Sprachen wählen oder alles neu beginnen.",
        'Erwachsene können ein fertiges Bild hinter der Elternsperre in Fotos sichern oder teilen. Die App liest die Fotomediathek nie.',
    ],
    credit="Die Bilder stammen aus Pastelki, einer freien Sammlung sanfter Illustrationen für kleine Kinder.",
)

L["fr"] = dict(
    name="Kolorowanki – Coloriage doux",
    subtitle="Des dessins pour les petits",
    keywords="enfant,bébé,maternelle,coloriages,colorier,couleurs,dessin,animaux,hors ligne,sans pub,calme",
    promo="Un livre de coloriage tout doux pour les enfants de 2 à 6 ans. Appuyer, choisir une couleur, toucher. Sans pub, sans achats, sans internet, sans données.",
    short="Un coloriage tout doux pour les enfants de 2 à 6 ans. Hors ligne, sans pub.",
    intro="Kolorowanki est un livre de coloriage tout doux pour les enfants de 2 à 6 ans.",
    how="Garde un doigt sur le dessin et sept couleurs douces apparaissent tout autour. Touche-en une et cette partie du dessin se remplit. Une petite touche reprend la même couleur. Écarte deux doigts pour zoomer sur les petits détails, et annule si tu changes d'avis. Chaque page s'enregistre toute seule : un dessin peut attendre demain.",
    inside_title="CE QU'IL Y A DEDANS",
    inside=[
        "Quatre sortes de pages, des plus simples aux plus remplies : un grand dessin, quelques amis, une petite scène et une page bien remplie.",
        "Des animaux, des aliments, des jouets et des objets du quotidien, dessinés avec douceur.",
        "Sept couleurs douces choisies pour chaque page.",
    ],
    calm_title="PENSÉ POUR LE CALME",
    calm="Pas de chrono, pas de score, pas de séries ni de récompenses pour jouer plus longtemps. Rien ne clignote et rien n'est bruyant. On ne peut pas mal colorier.",
    parents_title="POUR LES PARENTS",
    parents=[
        "Sans publicité et sans achats intégrés.",
        "Fonctionne entièrement hors ligne.",
        "Nous ne collectons aucune donnée. Les coloriages restent sur l'appareil.",
        "Les réglages et la politique de confidentialité sont protégés par un contrôle parental. On peut y choisir l'une des 17 langues ou tout recommencer.",
        "Un adulte peut enregistrer un dessin fini dans Photos ou le partager, derrière le contrôle parental. L'application ne lit jamais la photothèque.",
    ],
    credit="Les dessins viennent de Pastelki, une bibliothèque gratuite d'illustrations douces pour les petits.",
)

L["es"] = dict(
    name="Kolorowanki – Colorear",
    subtitle="Dibujos tranquilos para peques",
    keywords="niños,bebé,infantil,preescolar,pintar,colores,dibujos,animales,sin conexión,sin anuncios,calma",
    promo="Un libro de colorear tranquilo para niños de 2 a 6 años. Mantén, elige un color suave y toca. Sin anuncios, sin compras, sin internet y sin datos.",
    short="Un libro de colorear tranquilo para niños de 2 a 6 años. Sin anuncios.",
    intro="Kolorowanki es un libro de colorear tranquilo para niños de 2 a 6 años.",
    how="Mantén un dedo sobre el dibujo y aparecerán siete colores suaves alrededor. Toca uno y esa parte del dibujo se rellena. Un toque rápido vuelve a usar el mismo color. Con dos dedos puedes ampliar las partes pequeñas, y deshacer si cambias de idea. Cada página se guarda sola, así que un dibujo puede esperar a mañana.",
    inside_title="QUÉ HAY DENTRO",
    inside=[
        "Cuatro tipos de páginas, de fáciles a llenas: un dibujo grande, unos amigos, una pequeña escena y una página llena.",
        "Animales, comida, juguetes y cosas de cada día, con un dibujo suave y amable.",
        "Siete colores suaves elegidos para cada página.",
    ],
    calm_title="PENSADO PARA LA CALMA",
    calm="Sin tiempo límite, sin puntos, sin rachas y sin premios por jugar más rato. Nada parpadea y nada suena fuerte. No hay forma de colorear mal.",
    parents_title="PARA MADRES Y PADRES",
    parents=[
        "Sin anuncios y sin compras dentro de la app.",
        "Funciona totalmente sin conexión.",
        "No recogemos ningún dato. Los dibujos se quedan en el dispositivo.",
        "Los ajustes y la política de privacidad están protegidos por un control parental. Allí puedes elegir uno de 17 idiomas o empezar todo de nuevo.",
        'Un adulto puede guardar un dibujo terminado en Fotos o compartirlo, tras el control parental. La app nunca lee tu fototeca.',
    ],
    credit="Los dibujos vienen de Pastelki, una biblioteca gratuita de ilustraciones suaves para niños pequeños.",
)

L["it"] = dict(
    name="Kolorowanki – Da colorare",
    subtitle="Disegni dolci per i piccoli",
    keywords="bambini,bimbi,asilo,prescolare,colorare,colori,disegni,animali,offline,senza pubblicità,calma",
    promo="Un album da colorare tranquillo per bambini dai 2 ai 6 anni. Tieni premuto, scegli un colore, tocca. Niente pubblicità, acquisti, internet o dati.",
    short="Un album da colorare tranquillo per bambini dai 2 ai 6 anni. Offline.",
    intro="Kolorowanki è un album da colorare tranquillo per bambini dai 2 ai 6 anni.",
    how="Tieni un dito sul disegno e intorno compaiono sette colori delicati. Toccane uno e quella parte del disegno si riempie. Un tocco veloce usa di nuovo lo stesso colore. Con due dita puoi ingrandire i dettagli e annullare se cambi idea. Ogni pagina si salva da sola, così un disegno può aspettare domani.",
    inside_title="COSA C'È DENTRO",
    inside=[
        "Quattro tipi di pagine, dalle più facili alle più piene: un disegno grande, qualche amico, una piccola scena e una pagina piena.",
        "Animali, cibo, giocattoli e oggetti di tutti i giorni, disegnati con dolcezza.",
        "Sette colori delicati scelti per ogni pagina.",
    ],
    calm_title="PENSATO PER LA CALMA",
    calm="Niente timer, punteggi, serie o premi per giocare più a lungo. Niente lampeggia e niente è rumoroso. Non si può colorare male.",
    parents_title="PER I GENITORI",
    parents=[
        "Niente pubblicità e niente acquisti in-app.",
        "Funziona completamente offline.",
        "Non raccogliamo alcun dato. I disegni restano sul dispositivo.",
        "Le impostazioni e l'informativa sulla privacy sono protette da un controllo per adulti. Lì puoi scegliere una di 17 lingue o ricominciare tutto.",
        "Un adulto può salvare un disegno finito in Foto o condividerlo, dietro il controllo per adulti. L'app non legge mai la libreria foto.",
    ],
    credit="I disegni vengono da Pastelki, una raccolta gratuita di illustrazioni delicate per bambini piccoli.",
)

L["pt-BR"] = dict(
    name="Kolorowanki – Colorir",
    subtitle="Desenhos calmos para crianças",
    keywords="criança,bebê,infantil,pré-escola,pintar,cores,desenhos,animais,offline,sem anúncios,calma",
    promo="Um livro de colorir tranquilo para crianças de 2 a 6 anos. Segure, escolha uma cor suave e toque. Sem anúncios, compras, internet ou coleta de dados.",
    short="Um livro de colorir tranquilo para crianças de 2 a 6 anos. Offline.",
    intro="Kolorowanki é um livro de colorir tranquilo para crianças de 2 a 6 anos.",
    how="Segure um dedo no desenho e sete cores suaves aparecem ao redor. Toque em uma e aquela parte do desenho é preenchida. Um toque rápido usa a mesma cor de novo. Use dois dedos para ampliar os detalhes e desfaça se mudar de ideia. Cada página é salva sozinha, então um desenho pode esperar até amanhã.",
    inside_title="O QUE TEM DENTRO",
    inside=[
        "Quatro tipos de página, das mais fáceis às mais cheias: um desenho grande, alguns amigos, uma pequena cena e uma página cheia.",
        "Animais, comidas, brinquedos e coisas do dia a dia, com um traço suave e amigável.",
        "Sete cores suaves escolhidas para cada página.",
    ],
    calm_title="FEITO PARA ACALMAR",
    calm="Sem cronômetro, sem pontos, sem sequências e sem prêmios por jogar mais tempo. Nada pisca e nada é barulhento. Não existe jeito errado de colorir.",
    parents_title="PARA PAIS E MÃES",
    parents=[
        "Sem anúncios e sem compras no app.",
        "Funciona totalmente offline.",
        "Não coletamos nenhum dado. Os desenhos ficam no aparelho.",
        "As configurações e a política de privacidade ficam atrás de um controle para adultos. Lá você escolhe um de 17 idiomas ou recomeça tudo.",
        'Um adulto pode salvar um desenho pronto em Fotos ou compartilhá-lo, atrás do controle para adultos. O app nunca lê sua biblioteca de fotos.',
    ],
    credit="Os desenhos vêm do Pastelki, uma biblioteca gratuita de ilustrações suaves para crianças pequenas.",
)

L["pt-PT"] = dict(
    L["pt-BR"],
    subtitle="Desenhos calmos para os miúdos",
    keywords="criança,bebé,infantil,pré-escolar,pintar,cores,desenhos,animais,offline,sem anúncios,calma",
    promo="Um livro de colorir tranquilo para crianças dos 2 aos 6 anos. Segura, escolhe uma cor suave e toca. Sem anúncios, compras, internet ou recolha de dados.",
    short="Um livro de colorir tranquilo para crianças dos 2 aos 6 anos. Offline.",
    intro="Kolorowanki é um livro de colorir tranquilo para crianças dos 2 aos 6 anos.",
    how="Segura um dedo no desenho e aparecem sete cores suaves à volta. Toca numa e essa parte do desenho fica preenchida. Um toque rápido usa a mesma cor outra vez. Usa dois dedos para ampliar os pormenores e desfaz se mudares de ideias. Cada página guarda-se sozinha, por isso um desenho pode esperar até amanhã.",
    calm="Sem cronómetro, sem pontos, sem sequências e sem prémios por jogar mais tempo. Nada pisca e nada é barulhento. Não há forma errada de colorir.",
    parents_title="PARA OS PAIS",
    parents=[
        "Sem anúncios e sem compras na app.",
        "Funciona totalmente offline.",
        "Não recolhemos nenhum dado. Os desenhos ficam no dispositivo.",
        "As definições e a política de privacidade estão protegidas por um controlo para adultos. Aí podes escolher um de 17 idiomas ou recomeçar tudo.",
        'Um adulto pode guardar um desenho pronto em Fotografias ou partilhá-lo, atrás do controlo para adultos. A app nunca lê a sua biblioteca de fotografias.',
    ],
)

L["nl"] = dict(
    name="Kolorowanki – Kleurplaten",
    subtitle="Rustig kleuren voor peuters",
    keywords="kinderen,peuter,kleuter,kleurboek,kleuren,tekenen,schilderen,dieren,offline,geen reclame,rustig",
    promo="Een rustig kleurboek voor kinderen van 2 tot 6 jaar. Vasthouden, een zachte kleur kiezen, tikken. Geen reclame, aankopen, internet of gegevens.",
    short="Een rustig kleurboek voor kinderen van 2 tot 6 jaar. Offline, geen reclame.",
    intro="Kolorowanki is een rustig kleurboek voor kinderen van 2 tot 6 jaar.",
    how="Houd een vinger op de tekening en er verschijnen zeven zachte kleuren omheen. Tik er een aan en dat deel van de tekening kleurt in. Een snelle tik gebruikt dezelfde kleur opnieuw. Met twee vingers zoom je in op kleine stukjes, en je kunt alles ongedaan maken. Elke bladzijde wordt vanzelf bewaard, dus een tekening kan tot morgen wachten.",
    inside_title="WAT ZIT ERIN",
    inside=[
        "Vier soorten bladzijden, van makkelijk tot vol: één grote tekening, een paar vriendjes, een klein tafereel en een volle bladzijde.",
        "Dieren, eten, speelgoed en dingen van elke dag, zacht en vriendelijk getekend.",
        "Zeven zachte kleuren, gekozen per bladzijde.",
    ],
    calm_title="RUSTIG ONTWORPEN",
    calm="Geen tijdslimiet, geen punten, geen reeksen en geen beloningen voor langer spelen. Niets knippert en niets is luid. Je kunt niet verkeerd kleuren.",
    parents_title="VOOR OUDERS",
    parents=[
        "Geen reclame en geen in-app-aankopen.",
        "Werkt volledig offline.",
        "We verzamelen geen gegevens. De kleurplaten blijven op het apparaat.",
        "Instellingen en het privacybeleid zitten achter een ouderslot. Daar kies je een van 17 talen of begin je alles opnieuw.",
        "Een volwassene kan een klare tekening achter het ouderslot in Foto's bewaren of delen. De app leest je fotobibliotheek nooit.",
    ],
    credit="De tekeningen komen uit Pastelki, een gratis verzameling zachte illustraties voor jonge kinderen.",
)

L["uk"] = dict(
    name="Kolorowanki – розмальовки",
    subtitle="Спокійне малювання для малят",
    keywords="діти,малюк,садочок,малювати,кольори,тварини,офлайн",
    promo="Спокійна розмальовка для дітей від 2 до 6 років. Потримай, вибери м'який колір, торкнись. Без реклами, покупок, інтернету й збору даних.",
    short="Спокійна розмальовка для дітей від 2 до 6 років. Офлайн, без реклами.",
    intro="Kolorowanki — спокійна розмальовка для дітей від 2 до 6 років.",
    how="Потримай пальчик на малюнку, і навколо з'явиться сім м'яких кольорів. Торкнися одного, і ця частина малюнка заповниться. Швидкий дотик знову бере той самий колір. Двома пальцями можна збільшити дрібні деталі, а якщо передумаєш — скасувати. Кожна сторінка зберігається сама, тож малюнок може почекати до завтра.",
    inside_title="ЩО ВСЕРЕДИНІ",
    inside=[
        "Чотири види сторінок, від простих до насичених: один великий малюнок, кілька друзів, маленька сценка і повна сторінка.",
        "Тварини, їжа, іграшки та звичні речі, намальовані лагідно й привітно.",
        "Сім м'яких кольорів, дібраних для кожної сторінки.",
    ],
    calm_title="СПОКІЙНО Й БЕЗ ПОСПІХУ",
    calm="Немає таймерів, балів, серій чи нагород за довшу гру. Ніщо не блимає і ніщо не гучне. Розмалювати неправильно неможливо.",
    parents_title="ДЛЯ БАТЬКІВ",
    parents=[
        "Без реклами та без покупок у застосунку.",
        "Працює повністю офлайн.",
        "Ми не збираємо жодних даних. Розмальовки залишаються на пристрої.",
        "Налаштування та політика конфіденційності захищені батьківським замком. Там можна вибрати одну з 17 мов або почати все заново.",
        'Дорослий може зберегти готовий малюнок у Фото або поділитися ним за батьківським замком. Застосунок ніколи не читає медіатеку.',
    ],
    credit="Малюнки взято з Pastelki — безкоштовної бібліотеки лагідних ілюстрацій для малят.",
)

L["cs"] = dict(
    name="Kolorowanki – omalovánky",
    subtitle="Klidné vybarvování pro děti",
    keywords="děti,batole,školka,malování,barvy,kreslení,zvířátka,obrázky,offline,bez reklam,klidné",
    promo="Klidné omalovánky pro děti od 2 do 6 let. Podržet, vybrat jemnou barvu, klepnout. Bez reklam, nákupů, internetu a bez sběru dat.",
    short="Klidné omalovánky pro děti od 2 do 6 let. Offline, bez reklam a triků.",
    intro="Kolorowanki jsou klidné omalovánky pro děti od 2 do 6 let.",
    how="Podrž prst na obrázku a kolem se objeví sedm jemných barev. Klepni na jednu a ta část obrázku se vybarví. Rychlé klepnutí použije stejnou barvu znovu. Dvěma prsty přiblížíš malé kousky, a když si to rozmyslíš, vrátíš krok. Každá stránka se ukládá sama, takže obrázek může počkat do zítřka.",
    inside_title="CO JE UVNITŘ",
    inside=[
        "Čtyři druhy stránek, od snadných po plné: jeden velký obrázek, pár kamarádů, malá scénka a plná stránka.",
        "Zvířátka, jídlo, hračky a věci kolem nás, nakreslené jemně a přátelsky.",
        "Sedm jemných barev vybraných ke každé stránce.",
    ],
    calm_title="KLIDNĚ A BEZ SPĚCHU",
    calm="Žádný časový limit, body, série ani odměny za delší hraní. Nic nebliká a nic není hlasité. Vybarvit se nedá špatně.",
    parents_title="PRO RODIČE",
    parents=[
        "Bez reklam a bez nákupů v aplikaci.",
        "Funguje úplně offline.",
        "Nesbíráme žádná data. Omalovánky zůstávají v zařízení.",
        "Nastavení a zásady ochrany soukromí jsou za rodičovským zámkem. Tam vyberete jeden ze 17 jazyků nebo začnete vše znovu.",
        'Dospělý může hotový obrázek za rodičovským zámkem uložit do Fotek nebo sdílet. Aplikace nikdy nečte knihovnu fotek.',
    ],
    credit="Obrázky pocházejí z Pastelki, bezplatné knihovny jemných ilustrací pro malé děti.",
)

L["sk"] = dict(
    name="Kolorowanki – omaľovánky",
    subtitle="Pokojné vyfarbovanie pre deti",
    keywords="deti,batoľa,škôlka,maľovanie,farby,kreslenie,zvieratká,obrázky,offline,bez reklám,pokojné",
    promo="Pokojné omaľovánky pre deti od 2 do 6 rokov. Podržať, vybrať jemnú farbu, ťuknúť. Bez reklám, nákupov, internetu a bez zberu údajov.",
    short="Pokojné omaľovánky pre deti od 2 do 6 rokov. Offline, bez reklám a trikov.",
    intro="Kolorowanki sú pokojné omaľovánky pre deti od 2 do 6 rokov.",
    how="Podrž prst na obrázku a okolo sa objaví sedem jemných farieb. Ťukni na jednu a tá časť obrázka sa vyfarbí. Rýchle ťuknutie použije rovnakú farbu znova. Dvoma prstami priblížiš malé kúsky, a keď si to rozmyslíš, vrátiš krok. Každá stránka sa ukladá sama, takže obrázok môže počkať do zajtra.",
    inside_title="ČO JE VNÚTRI",
    inside=[
        "Štyri druhy stránok, od ľahkých po plné: jeden veľký obrázok, pár kamarátov, malá scénka a plná stránka.",
        "Zvieratká, jedlo, hračky a veci okolo nás, nakreslené jemne a priateľsky.",
        "Sedem jemných farieb vybraných ku každej stránke.",
    ],
    calm_title="POKOJNE A BEZ PONÁHĽANIA",
    calm="Žiadny časový limit, body, série ani odmeny za dlhšie hranie. Nič nebliká a nič nie je hlasné. Vyfarbiť sa nedá zle.",
    parents_title="PRE RODIČOV",
    parents=[
        "Bez reklám a bez nákupov v aplikácii.",
        "Funguje úplne offline.",
        "Nezbierame žiadne údaje. Omaľovánky zostávajú v zariadení.",
        "Nastavenia a zásady ochrany súkromia sú za rodičovským zámkom. Tam vyberiete jeden zo 17 jazykov alebo začnete všetko odznova.",
        'Dospelý môže hotový obrázok za rodičovským zámkom uložiť do Fotiek alebo zdieľať. Aplikácia nikdy nečíta knižnicu fotiek.',
    ],
    credit="Obrázky pochádzajú z Pastelki, bezplatnej knižnice jemných ilustrácií pre malé deti.",
)

L["sv"] = dict(
    name="Kolorowanki – Målarbok",
    subtitle="Lugn färgläggning för små",
    keywords="barn,småbarn,förskola,måla,färger,färglägga,rita,djur,offline,ingen reklam,lugn",
    promo="En lugn målarbok för barn mellan 2 och 6 år. Håll, välj en mjuk färg, tryck. Ingen reklam, inga köp, inget internet och ingen datainsamling.",
    short="En lugn målarbok för barn mellan 2 och 6 år. Offline, ingen reklam.",
    intro="Kolorowanki är en lugn målarbok för barn mellan 2 och 6 år.",
    how="Håll ett finger på bilden så dyker sju mjuka färger upp runt den. Tryck på en så fylls den delen av bilden. Ett snabbt tryck tar samma färg igen. Nyp med två fingrar för att zooma in på små delar, och ångra om du ändrar dig. Varje sida sparas av sig själv, så en bild kan vänta till i morgon.",
    inside_title="DET HÄR FINNS",
    inside=[
        "Fyra sorters sidor, från lätta till fulla: en stor bild, några kompisar, en liten scen och en full sida.",
        "Djur, mat, leksaker och vardagssaker, ritade mjukt och vänligt.",
        "Sju mjuka färger utvalda för varje sida.",
    ],
    calm_title="LUGN SOM GRUNDTANKE",
    calm="Inga tidsgränser, inga poäng, inga serier och inga belöningar för att spela längre. Ingenting blinkar och ingenting låter högt. Det går inte att måla fel.",
    parents_title="FÖR FÖRÄLDRAR",
    parents=[
        "Ingen reklam och inga köp i appen.",
        "Fungerar helt offline.",
        "Vi samlar inte in några data. Målningarna stannar på enheten.",
        "Inställningar och integritetspolicy ligger bakom ett föräldralås. Där kan du välja ett av 17 språk eller börja om alla sidor.",
        'En vuxen kan spara en färdig bild i Bilder eller dela den, bakom föräldralåset. Appen läser aldrig ditt bildbibliotek.',
    ],
    credit="Bilderna kommer från Pastelki, ett gratis bibliotek med mjuka illustrationer för små barn.",
)

L["ro"] = dict(
    name="Kolorowanki – De colorat",
    subtitle="Desene liniștite pentru copii",
    keywords="copii,bebe,grădiniță,preșcolar,pictură,culori,desen,animale,offline,fără reclame,calm",
    promo="O carte de colorat liniștită pentru copii între 2 și 6 ani. Ține apăsat, alege o culoare blândă, atinge. Fără reclame, cumpărături, internet sau date.",
    short="O carte de colorat liniștită pentru copii între 2 și 6 ani. Fără reclame.",
    intro="Kolorowanki este o carte de colorat liniștită pentru copii între 2 și 6 ani.",
    how="Ține un deget pe desen și în jur apar șapte culori blânde. Atinge una și acea parte a desenului se umple. O atingere scurtă folosește din nou aceeași culoare. Cu două degete poți mări detaliile mici și poți anula dacă te răzgândești. Fiecare pagină se salvează singură, așa că un desen poate aștepta până mâine.",
    inside_title="CE GĂSIȚI ÎNĂUNTRU",
    inside=[
        "Patru feluri de pagini, de la ușoare la pline: un desen mare, câțiva prieteni, o scenă mică și o pagină plină.",
        "Animale, mâncare, jucării și lucruri de zi cu zi, desenate blând și prietenos.",
        "Șapte culori blânde alese pentru fiecare pagină.",
    ],
    calm_title="GÂNDIT PENTRU LINIȘTE",
    calm="Fără cronometru, puncte, serii sau recompense pentru joc mai lung. Nimic nu clipește și nimic nu e zgomotos. Nu poți colora greșit.",
    parents_title="PENTRU PĂRINȚI",
    parents=[
        "Fără reclame și fără cumpărături în aplicație.",
        "Funcționează complet offline.",
        "Nu colectăm niciun fel de date. Desenele rămân pe dispozitiv.",
        "Setările și politica de confidențialitate sunt protejate de o barieră pentru părinți. Acolo poți alege una din 17 limbi sau poți lua totul de la capăt.",
        'Un adult poate salva un desen terminat în Poze sau îl poate distribui, după bariera pentru părinți. Aplicația nu citește niciodată biblioteca foto.',
    ],
    credit="Desenele vin din Pastelki, o bibliotecă gratuită de ilustrații blânde pentru copii mici.",
)

L["hu"] = dict(
    name="Kolorowanki – Kifestő",
    subtitle="Nyugodt színezés kicsiknek",
    keywords="gyerek,kisgyerek,ovis,óvoda,festés,színek,rajzolás,állatok,offline,reklám nélkül,nyugodt",
    promo="Nyugodt kifestő 2–6 éves gyerekeknek. Tartsd, válassz egy lágy színt, koppints. Nincs reklám, vásárlás, internet és adatgyűjtés.",
    short="Nyugodt kifestő 2–6 éves gyerekeknek. Offline, reklám és trükkök nélkül.",
    intro="A Kolorowanki nyugodt kifestő 2–6 éves gyerekeknek.",
    how="Tartsd az ujjad a képen, és körülötte megjelenik hét lágy szín. Koppints egyre, és a kép az a része kiszíneződik. Egy gyors koppintás újra ugyanazt a színt használja. Két ujjal ránagyíthatsz az apró részekre, és visszavonhatod, ha meggondolod magad. Minden oldal magától mentődik, így egy kép várhat holnapig.",
    inside_title="MI VAN BENNE",
    inside=[
        "Négyféle oldal, a könnyűtől a zsúfoltig: egy nagy kép, néhány barát, egy kis jelenet és egy teli oldal.",
        "Állatok, ételek, játékok és hétköznapi tárgyak, szelíd, barátságos rajzokon.",
        "Hét lágy szín minden oldalhoz válogatva.",
    ],
    calm_title="NYUGALOMRA TERVEZVE",
    calm="Nincs időkorlát, pontszám, sorozat és jutalom a hosszabb játékért. Semmi sem villog és semmi sem hangos. Rosszul színezni nem lehet.",
    parents_title="SZÜLŐKNEK",
    parents=[
        "Nincs reklám és nincs alkalmazáson belüli vásárlás.",
        "Teljesen offline működik.",
        "Semmilyen adatot nem gyűjtünk. A színezések az eszközön maradnak.",
        "A beállítások és az adatvédelmi tájékoztató szülői zár mögött vannak. Ott 17 nyelv közül választhatsz, vagy újrakezdheted az összes oldalt.",
        'Egy felnőtt a szülői zár mögött a Fotókba mentheti vagy megoszthatja a kész képet. Az alkalmazás soha nem olvassa a fotókönyvtárat.',
    ],
    credit="A képek a Pastelki gyűjteményből származnak, amely kisgyerekeknek készült szelíd illusztrációk ingyenes könyvtára.",
)

L["tr"] = dict(
    name="Kolorowanki – Boyama",
    subtitle="Küçükler için sakin boyama",
    keywords="çocuk,bebek,okul öncesi,anaokulu,boya,renkler,çizim,hayvanlar,çevrimdışı,reklamsız,sakin",
    promo="2-6 yaş arası çocuklar için sakin bir boyama kitabı. Basılı tut, yumuşak bir renk seç, dokun. Reklam, satın alma, internet ve veri toplama yok.",
    short="2-6 yaş arası çocuklar için sakin bir boyama kitabı. Çevrimdışı, reklamsız.",
    intro="Kolorowanki, 2-6 yaş arası çocuklar için sakin bir boyama kitabıdır.",
    how="Parmağını resmin üzerinde tut, etrafında yedi yumuşak renk belirsin. Birine dokun, resmin o bölümü boyansın. Hızlı bir dokunuş aynı rengi yeniden kullanır. İki parmakla küçük yerleri yakınlaştırabilir, fikrini değiştirirsen geri alabilirsin. Her sayfa kendiliğinden kaydedilir; bir resim yarını bekleyebilir.",
    inside_title="İÇİNDE NELER VAR",
    inside=[
        "Kolaydan doluya dört tür sayfa: tek büyük resim, birkaç arkadaş, küçük bir sahne ve dolu bir sayfa.",
        "Hayvanlar, yiyecekler, oyuncaklar ve günlük eşyalar, yumuşak ve sevimli çizimlerle.",
        "Her sayfa için seçilmiş yedi yumuşak renk.",
    ],
    calm_title="SAKİNLİK İÇİN TASARLANDI",
    calm="Süre sınırı, puan, seri ya da daha uzun oynamak için ödül yok. Hiçbir şey yanıp sönmez, hiçbir şey yüksek sesli değildir. Yanlış boyamak diye bir şey yok.",
    parents_title="EBEVEYNLER İÇİN",
    parents=[
        "Reklam ve uygulama içi satın alma yok.",
        "Tamamen çevrimdışı çalışır.",
        "Hiçbir veri toplamıyoruz. Boyamalar cihazda kalır.",
        "Ayarlar ve gizlilik politikası bir ebeveyn kilidinin arkasındadır. Orada 17 dilden birini seçebilir ya da tüm sayfalara yeniden başlayabilirsiniz.",
        "Bir büyük, ebeveyn kilidinin arkasından biten resmi Fotoğraflar'a kaydedebilir veya paylaşabilir. Uygulama fotoğraf arşivinizi asla okumaz.",
    ],
    credit="Resimler, küçük çocuklar için yumuşak çizimlerden oluşan ücretsiz Pastelki kütüphanesinden geliyor.",
)

L["ja"] = dict(
    name="Kolorowanki – やさしいぬりえ",
    subtitle="2〜6歳向けのおだやかなぬりえ",
    keywords="子供,幼児,知育,保育園,幼稚園,お絵かき,色,動物,オフライン,広告なし",
    promo="2〜6歳の子どものための、おだやかなぬりえ。指で押さえて、やさしい色をえらんで、タップ。広告・課金・インターネット接続・データ収集はありません。",
    short="2〜6歳向けのおだやかなぬりえ。オフライン、広告なし。",
    intro="Kolorowanki は、2〜6歳の子どものための、おだやかなぬりえアプリです。",
    how="絵の上で指を押したままにすると、まわりに7つのやさしい色があらわれます。色をタップすると、その部分がぬられます。すばやくタップすると同じ色をもう一度使えます。2本の指で細かいところを拡大でき、気が変わったら元に戻せます。どのページも自動で保存されるので、続きはまた明日でも大丈夫です。",
    inside_title="なかみ",
    inside=[
        "かんたんなものからにぎやかなものまで、4種類のページ：おおきな絵ひとつ、なかよしの仲間、ちいさな景色、にぎやかなページ。",
        "動物、食べもの、おもちゃ、身のまわりのものを、やさしいタッチで描いています。",
        "ページごとに選んだ7つのやさしい色。",
    ],
    calm_title="おだやかさを大切に",
    calm="タイマー、点数、連続記録、長く遊ぶほどもらえるごほうびはありません。点滅するものも、大きな音もありません。ぬりかたに正解・不正解はありません。",
    parents_title="保護者の方へ",
    parents=[
        "広告もアプリ内課金もありません。",
        "完全にオフラインで動作します。",
        "データは一切収集しません。ぬりえは端末の中だけに保存されます。",
        "設定とプライバシーポリシーは保護者向けのロックの先にあります。17の言語から選んだり、すべてのページを最初からやり直したりできます。",
        'できあがった絵は、保護者向けのロックの先で大人が写真に保存したり共有したりできます。アプリがフォトライブラリを読むことはありません。',
    ],
    credit="絵は、小さな子ども向けのやさしいイラストを集めた無料ライブラリ Pastelki のものです。",
)

L["zh"] = dict(
    name="Kolorowanki – 安静涂色",
    subtitle="给小朋友的温柔涂色书",
    keywords="儿童,幼儿,宝宝,早教,幼儿园,画画,填色,颜色,动物,离线,无广告",
    promo="一本给 2 到 6 岁孩子的安静涂色书。按住、选一种柔和的颜色、点一下。没有广告，没有购买，不用联网，不收集任何数据。",
    short="给 2 到 6 岁孩子的安静涂色书。离线使用，没有广告。",
    intro="Kolorowanki 是一本给 2 到 6 岁孩子的安静涂色书。",
    how="用手指按住图画，周围会出现七种柔和的颜色。点一种颜色，那一块就会被涂满。轻点一下会再次使用同一种颜色。两根手指可以放大细小的地方，改变主意时可以撤销。每一页都会自动保存，一幅画可以留到明天再画。",
    inside_title="里面有什么",
    inside=[
        "从简单到丰富的四种页面：一幅大图、几个好朋友、一个小场景和满满一页。",
        "动物、食物、玩具和日常物品，画风温柔可爱。",
        "每一页都配好了七种柔和的颜色。",
    ],
    calm_title="为安静而设计",
    calm="没有计时，没有分数，没有连续打卡，也没有玩得越久奖励越多。没有闪烁，没有吵闹的声音。怎么涂都不会错。",
    parents_title="写给家长",
    parents=[
        "没有广告，没有应用内购买。",
        "完全离线使用。",
        "我们不收集任何数据。涂色作品只保存在设备上。",
        "设置和隐私政策在家长验证之后。您可以在那里选择 17 种语言之一，或让所有页面重新开始。",
        '大人可以在家长验证后，把完成的图画保存到照片或分享。应用从不读取您的照片图库。',
    ],
    credit="图画来自 Pastelki，一个为幼儿准备的温柔插画免费图库。",
)

# Store locale -> copy key.
APPLE = {
    "en-US": "en", "en-GB": "en-GB", "pl": "pl", "de-DE": "de", "fr-FR": "fr", "fr-CA": "fr",
    "es-ES": "es", "es-MX": "es", "it": "it", "pt-BR": "pt-BR", "pt-PT": "pt-PT", "nl-NL": "nl",
    "uk": "uk", "cs": "cs", "sk": "sk", "sv": "sv", "ro": "ro", "hu": "hu", "tr": "tr", "ja": "ja",
    "zh-Hans": "zh",
}
PLAY = {
    "en-US": "en", "pl-PL": "pl", "de-DE": "de", "fr-FR": "fr", "es-ES": "es", "it-IT": "it",
    "pt-BR": "pt-BR", "pt-PT": "pt-PT", "nl-NL": "nl", "uk": "uk", "cs-CZ": "cs", "sk": "sk",
    "sv-SE": "sv", "ro": "ro", "hu-HU": "hu", "tr-TR": "tr", "ja-JP": "ja", "zh-CN": "zh",
}


def description(c):
    parts = [c["intro"], c["how"], c["inside_title"] + "\n" + "\n".join("• " + x for x in c["inside"]),
             c["calm_title"] + "\n" + c["calm"],
             c["parents_title"] + "\n" + "\n".join("• " + x for x in c["parents"]),
             c["credit"] + "\n" + REPO_LINE]
    return "\n\n".join(parts)


def check(locale, c):
    problems = []
    if len(c["name"]) > 30: problems.append(f"name {len(c['name'])}")
    if len(c["subtitle"]) > 30: problems.append(f"subtitle {len(c['subtitle'])}")
    if len(c["keywords"].encode()) > 100: problems.append(f"keywords {len(c['keywords'].encode())}B")
    if len(c["promo"]) > 170: problems.append(f"promo {len(c['promo'])}")
    if len(c["short"]) > 80: problems.append(f"short {len(c['short'])}")
    if len(description(c)) > 4000: problems.append("description")
    if problems: raise SystemExit(f"{locale}: over limit: {', '.join(problems)}")


ADVISORY = {
    "alcoholTobaccoOrDrugUseOrReferences": "NONE", "contests": "NONE", "gamblingSimulated": "NONE",
    "gunsOrOtherWeapons": "NONE", "horrorOrFearThemes": "NONE", "matureOrSuggestiveThemes": "NONE",
    "medicalOrTreatmentInformation": "NONE", "profanityOrCrudeHumor": "NONE",
    "sexualContentGraphicAndNudity": "NONE", "sexualContentOrNudity": "NONE",
    "violenceCartoonOrFantasy": "NONE", "violenceRealistic": "NONE",
    "violenceRealisticProlongedGraphicOrSadistic": "NONE", "advertising": False, "ageAssurance": False,
    "gambling": False, "healthOrWellnessTopics": False, "lootBox": False, "messagingAndChat": False,
    "parentalControls": False, "unrestrictedWebAccess": False, "userGeneratedContent": False,
    "kidsAgeBand": "FIVE_AND_UNDER", "ageRatingOverride": "NONE", "ageRatingOverrideV2": "NONE",
    "koreaAgeRatingOverride": "NONE", "developerAgeRatingInfoUrl": None,
}

REVIEW_NOTES = """Kolorowanki is a calm, fully offline colouring book for children aged 2-6 (Made for Kids, 5 and under). Free, no in-app purchases, no ads, no accounts, no network requests, no data collection. The only permission prompt is add-only Photos access, shown when a grown-up saves a picture behind the parental gate.

NO LOGIN NEEDED
Launch the app. The home screen shows four large cards (one big picture / a few friends / a little scene / a busy page). Tap a card, then tap a picture.

HOW TO COLOUR
- Press and hold a spot on the picture: a ring of 7 soft colours appears around the finger. Tap a colour: the whole region under the finger fills with it.
- After that, a quick tap fills with the last colour used.
- Pinch to zoom, drag to move, the arrow button undoes the last fill, the back button returns to the list. Everything saves automatically; thumbnails show the child's colouring.
- No timers, no scores, no streaks, no rewards, no failure state.

PARENTAL GATE / GROWN-UPS AREA
- On the home screen tap the small two-people icon in the top-right corner.
- Press and hold the button for 3 seconds, then answer a multiplication written in words (e.g. "What is seven times four?") by tapping one of 4 numbers. The question is random each time. A wrong answer returns to the home screen.
- Inside: language (follows the device by default; 17 languages can be chosen), "Start all pages again" (with a confirmation), About (including the credit for the Pastelki picture library, MIT) and the full privacy policy shown in-app. There are no links out of the app.

AUDIO
Soft music: the theme plays once on the home screen, the colouring tune up to three times per page, then silence. The note button (home screen and colouring toolbar) and a switch in the grown-ups area turn it off. Audio follows the ring/silent switch and stops when the app goes to the background. No microphone, no background audio.

OFFLINE / PRIVACY
The app works entirely in airplane mode. Colourings and the language choice are stored only on the device (local key-value storage). Saving a finished picture to Photos or sharing it is only offered behind the parental gate; the app asks only for add-only Photos access at that moment and never reads the photo library. No external links, web views, purchases, review prompts, notifications or social features anywhere in the app."""


def main():
    for k, c in L.items():
        check(k, c)
    info = {}
    for loc, key in APPLE.items():
        c = L[key]
        info[loc] = {
            "title": c["name"], "subtitle": c["subtitle"], "description": description(c),
            "keywords": c["keywords"].split(","), "promoText": c["promo"],
            "supportUrl": site_url(key), "privacyPolicyUrl": site_url(key, "privacy/"),
            "marketingUrl": MARKETING_URL,
        }
    config = {
        "configVersion": 0,
        "apple": {
            "copyright": "2026 tobob",
            "categories": ["EDUCATION", "ENTERTAINMENT"],
            "advisory": ADVISORY,
            "release": {"automaticRelease": True},
            "review": {"demoRequired": False, "notes": REVIEW_NOTES},
            "info": info,
        },
    }
    (ROOT / "store.config.json").write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n")

    md = ["# Kolorowanki: Google Play listing (v1.0)", "",
          "Generated by `tools/store/listings.py` (same copy as `store.config.json`). Paste per language in Play Console → Grow → Store presence → Main store listing.",
          "Limits (checked by the script): app name ≤ 30, short description ≤ 80, full description ≤ 4000 characters.",
          "", "- Category: **Apps › Education** (alternative: Art & Design). Target audience: **ages 5 and under** only.",
          f"- Website: {SUPPORT_URL} · Privacy policy: {PRIVACY_URL}",
          "- Contact e-mail: enter it in Play Console only (shown publicly), never in this repo.",
          "- Declarations: Ads **No** · Advertising ID **No** (AD_ID is blocked in app.json) · Data safety **No data collected or shared** · App access **all functionality available without special access** · IARC: no to everything (expected PEGI 3 / ESRB Everyone).",
          "- Graphics: icon 512×512 (`assets/images/icon.png` downscaled), feature graphic 1024×500 (to do), ≥ 4 phone screenshots + 7\"/10\" tablet screenshots.", ""]
    for loc, key in PLAY.items():
        c = L[key]
        d = description(c)
        md += [f"## {loc}", "", f"**App name** ({len(c['name'])}/30)", "```", c["name"], "```", "",
               f"**Short description** ({len(c['short'])}/80)", "```", c["short"], "```", "",
               f"**Full description** ({len(d)}/4000)", "```", d, "```", ""]
    (ROOT / "docs/store").mkdir(parents=True, exist_ok=True)
    (ROOT / "docs/store/GOOGLE_PLAY.md").write_text("\n".join(md))
    for loc, key in APPLE.items():
        c = L[key]
        print(f"{loc:8} name {len(c['name']):2}/30  sub {len(c['subtitle']):2}/30  kw {len(c['keywords'].encode()):3}/100B  promo {len(c['promo']):3}/170  desc {len(description(c))}")


main()
