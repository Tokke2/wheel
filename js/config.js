/**
 * ============================================================================
 * BACKSTAGE WHEELS — GRUNDKONFIGURATION (js/config.js)
 * ============================================================================
 */

window.BACKSTAGE_DEFAULT_SETTINGS = {
  // Varumärke & Logotyp
  brandName: "BACKSTAGE WHEELS",
  brandSubtitle: "LEGENDS OF ROCK · VIP LIMO",
  tagline: "Hyra Hummer H2 Limousine — 10 meter ren rock 'n' roll i hela Sverige",
  logoUrl: "",
  logoHeight: 44,
  showBrandTextWithLogo: true,

  // Merch-läge: "coming_soon" (visa design & samla intresse) eller "live" (direktbeställning)
  merchShopMode: "coming_soon",

  // Kontaktuppgifter (alla telefonnummer & mailadresser är klickbara överallt)
  contactEmail: "bokning@backstagewheels.se",
  contactPhone: "070-123 45 67",
  homeRegion: "Utgår från Dalarna / Mellansverige – kör uppdrag i hela Sverige!",
  contactIntro:
    "Vill ni hyra Sveriges mäktigaste 10-meters Hummer-limousine till bröllop, bal, studenten, svensexa, möhippa, musikvideo, sponsorevent, Oktoberfest eller festival? Ring, maila eller kolla lediga tider i kalendern!",

  // Publika länkar till sociala kanaler
  instagramUrl: "https://www.instagram.com/backstagewheels/",
  instagramHandle: "@backstagewheels",
  facebookUrl: "https://www.facebook.com/drhcustoms",
  facebookLabel: "Facebook · Dr H Customs",

  // Copyright & Skapare
  copyrightStartYear: 2025,
  copyrightHolder: "Backstage Wheels",
  creatorCredit: "Hemsidan är skapad av Rickard Längkvist i samarbete med Backstage Wheels",

  // Rullande turné- & referensbanderoll
  tourHighlights: [
    "Sweden Rock 🔥",
    "Oktoberfest VIP-Resa (Tur & Retur) 🔥",
    "Elmia Custom Motor Show 🔥",
    "Classic Car Week Rättvik 🔥",
    "Gatebil Mantorp 🔥",
    "Vallåkraträffen 🔥",
    "MKRS Rock Leksand 🔥",
    "B2B · Musikvideor · Studentutskott · Bröllop · Bal 🔥"
  ],

  // --------------------------------------------------------------------------
  // PRISER & BOKNINGSPAKET (inkl. Sponsorevent & Oktoberfest!)
  // --------------------------------------------------------------------------
  bookingPackages: [
    {
      id: "vardags-vip",
      badge: "MÅNDAG–TORSDAG · FRÅN CA 345 KR/PERS VID 16 PERS",
      title: "Vardagskörning & Företags-AW",
      price: "5 500 kr / timme",
      desc: "Gör en vardag oförglömlig! Perfekt för födelsedagsöverraskning, kundevent, AW med kollegorna, skolbal eller musikvideoinspelning. Bilen rymmer upp till 16 personer (även mindre sällskap på t.ex. 8–12 personer åker kungligt!).",
      highlights: [
        "Pris måndag–torsdag: 5 500 kr per timme inkl. chaufför",
        "Delat på full bil (16 pers): ca 344 kr/pers – vid 10 pers: 550 kr/pers",
        "Egen Spotify-spellista via Bluetooth & upplyst bar (vi bjuder/serverar ej alkohol)"
      ]
    },
    {
      id: "helg-pass",
      badge: "FREDAG–SÖNDAG · FRÅN CA 470 KR/PERS VID 16 PERS",
      title: "Helg-VIP, Bröllop & Kvällspass",
      price: "7 500 kr / timme",
      desc: "Maximal entré på helgen! Bilen rymmer upp till 16 passagerare – vid full bil landar en timme under 490 kr per person (ca 469 kr/pers), och även när bilen inte är full blir delad kostnad överraskande prisvärd för hela gänget.",
      highlights: [
        "Helgpris fredag–söndag: 7 500 kr per timme inkl. chaufför",
        "Välj mellan kvällens 3 populära pass: Förfest, Prime Time eller Nattpass",
        "Tid för fotografering framför Dr H Customs motivlackering"
      ]
    },
    {
      id: "heldag-12h",
      badge: "HELDAG · 12 TIMMAR",
      title: "Heldagspaket (12 Timmar)",
      price: "25 000 kr (12 h)",
      desc: "Hela dagen med egen 10-meters Hummer H2 Limousine och chaufför! Ultimat för bröllopsdagar, festivalresor, Classic Car Week, studentutskott och heldagsutflykter.",
      highlights: [
        "Fast paketpris: 25 000 kr för 12 sammanhängande timmar",
        "Upp till 16 passagerare – ca 1 560 kr/pers för en hel 12-timmarsdag vid full bil!",
        "Skräddarsydd rutt med valfria fotostopp längs vägen"
      ]
    },
    {
      id: "sponsorevent",
      badge: "FÖRETAG · MÄSSA · FESTIVAL",
      title: "Sponsorevent & Varumärkesdag",
      price: "Från 50 000 kr / dag + lunch och hotell",
      desc: "Sveriges mest fotograferade blickfång för företagsevent, lanseringar, mässor, invigningar och festivaler över hela landet.",
      highlights: [
        "Från 50 000 kr per dag + lunch och hotell och drivmedel",
        "Exponering i absoluta toppklass med VIP-visningar & kundåkturer",
        "Kan bokas för enstaka dagar eller hela festivalveckor"
      ]
    },
    {
      id: "oktoberfest-resa",
      badge: "SPECIALRESA · ÅLDERSGRÄNS 18 ÅR",
      title: "Oktoberfest – Resa Till & Från",
      price: "20 000 kr / person (minst 16 st)",
      desc: "Den ultimata VIP-resan till och från Oktoberfest med hela gänget i 10 meter hårdrockslimousine! Upplev resan som en enda lång backstage-fest tur och retur.",
      highlights: [
        "Pris: 20 000 kr per person (resa till och från Oktoberfest)",
        "Minst 16 personer i sällskapet",
        "Lunch under resan ingår under färd (ej på plats) · Boende/logi ingår ej",
        "Åldersgräns: 18 år (observera att vi ej serverar/bjuder på alkoholhaltiga drycker)"
      ]
    }
  ],

  // --------------------------------------------------------------------------
  // KVÄLLENS 3 PASS (Dubblar/tripplar helgupplevelsen – enkla pass att boka!)
  // --------------------------------------------------------------------------
  eveningPasses: [
    {
      id: "pass-1",
      passNumber: "PASS 1 · TIDIG KVÄLL",
      timeRange: "Kl. 17:30 – 19:30",
      startTime: "17:30",
      title: "Förfest, AW & Middagsentré",
      priceInfo: "Vardag 5 500 kr/h · Helg 7 500 kr/h",
      perPersonNote: "Från ca 345–470 kr/pers/h vid 16 pers",
      desc: "Starta kvällen på topp! Vi hämtar upp er, kör en stämningsfull runda med er musik på hög volym och släpper av er direkt framför restaurangen, balen eller förfesten."
    },
    {
      id: "pass-2",
      passNumber: "PASS 2 · PRIME TIME",
      timeRange: "Kl. 20:00 – 22:30",
      startTime: "20:00",
      title: "Cruising & Storslagen VIP-Entré",
      priceInfo: "Vardag 5 500 kr/h · Helg 7 500 kr/h",
      perPersonNote: "Kvällens mest efterfrågade pass!",
      desc: "Rulla genom stan när pulsen är som högst! Fotostopp med gänget och en entré till konserten, festen eller nattklubben som garanterat får hela kön att vända sig om."
    },
    {
      id: "pass-3",
      passNumber: "PASS 3 · SEN KVÄLL / NATT",
      timeRange: "Kl. 23:00 – 01:30",
      startTime: "23:00",
      title: "Nattcruising & VIP-Hemresa",
      priceInfo: "Vardag 5 500 kr/h · Helg 7 500 kr/h",
      perPersonNote: "Slipp taxiköer – avsluta som rockstjärnor",
      desc: "När konserten eller klubben stänger väntar er egen 10-meters Hummer utanför dörren. Fortsätt kvällens skönaste häng i VIP-loungen hela vägen vidare eller hem."
    }
  ],

  // --------------------------------------------------------------------------
  // B2B, MUSIKVIDEOR & STUDENTUTSKOTT
  // --------------------------------------------------------------------------
  b2bSegments: [
    {
      id: "seg-b2b",
      kicker: "FÖRETAG · B2B · PR",
      title: "B2B, Varumärkesaktivering & Kundevent",
      desc: "Ingen vanlig reklamskylt kan mäta sig med en 10 meter lång motivlackad Hummer H2 utanför er butiksinvigning, mässmonter eller produktlansering. Kombinera publikmagnet på plats med VIP-åkturer för nyckelkunder och personal. Sponsorevent från 50 000 kr/dag + lunch, hotell och drivmedel.",
      eventSelect: "Företagsevent / Musikvideo / PR"
    },
    {
      id: "seg-video",
      kicker: "PRODUKTION · MEDIA · ARTIST",
      title: "Musikvideor, Reklamfilm, TV & Fotografering",
      desc: "Redan uppmärksammad på Elmia, Vallåkraträffen, SVT och TikTok! Dr H Customs eldsflammor, blixtar och rockikoner gör bilen till ett färdigt hero-fordon framför kameran – samtidigt som kupén fungerar som rullande lounge för artister och produktionsteam mellan tagningarna.",
      eventSelect: "Företagsevent / Musikvideo / PR"
    },
    {
      id: "seg-student",
      kicker: "SKOLOR · BAL · EXAMEN",
      title: "Studentutskott, Balveckor & Klassbokningar",
      desc: "Planerar studentutskottet vårens bal eller studentvecka? Boka flera sammanhängande pass under balförkvällen eller en hel 12-timmarsdag (25 000 kr) så flera kompisgäng på skolan kan dela på upplevelsen. Upp till 16 passagerare per tur ger oslagbart pris per elev!",
      eventSelect: "Bal / Student"
    }
  ],

  // --------------------------------------------------------------------------
  // 5 STADSSPECIFIKA SEO-LANDNINGSSEKTIONER
  // --------------------------------------------------------------------------
  cityLandingPages: [
    {
      slug: "borlange-falun",
      city: "Borlänge & Falun",
      regionTag: "HEMMABAS DALARNA",
      headline: "Hyra Hummer Limousine i Borlänge & Falun",
      summary: "Vår hemmabas i hjärtat av Dalarna! Snabb framkörning för företags-AW, bröllop vid gruvan eller Runn, baler, studentutspring, svensexor och utekvällar i både Borlänge och Falun.",
      popularFor: "Bröllop, Bal & Student, Företags-AW (5 500 kr/h vardag), Konsertentré & 3 Kvällspass",
      pickupExample: "Borlänge / Falun"
    },
    {
      slug: "rattvik-leksand-mora",
      city: "Rättvik, Leksand & Mora",
      regionTag: "DALHALLA & SILJAN",
      headline: "VIP-Limousine till Dalhalla, Classic Car Week & Siljan",
      summary: "Gör konsertkvällen på Dalhalla, bröllopet vid Siljan eller cruisingen under Classic Car Week helt oförglömlig! Vi hämtar vid hotell, stugbyar eller hemadress runt hela Siljansbygden.",
      popularFor: "Dalhalla-konserter, Classic Car Week, Heldagspaket 12 h (25 000 kr) & Bröllop",
      pickupExample: "Rättvik / Leksand / Dalhalla"
    },
    {
      slug: "stockholm-uppsala",
      city: "Stockholm & Uppsala",
      regionTag: "STORSTADS-VIP & ARENOR",
      headline: "Hårdrocks-Limousine i Stockholm, Solna & Uppsala",
      summary: "Stick ut totalt bland alla vanliga bilar i huvudstaden! Perfekt för arenakonserter, röda-mattan-premiärer, musikvideoinspelningar, studentbaler, möhippor, svensexor och stora B2B-lanseringar.",
      popularFor: "Arenakonserter, Musikvideor & PR, Sponsorevent (från 50 000 kr/dag) & Heldag 12 h",
      pickupExample: "Stockholm / Uppsala"
    },
    {
      slug: "vasteras-orebro",
      city: "Västerås & Örebro",
      regionTag: "MÄLARDALEN & NÄRKE",
      headline: "Hyra 10-Meters Hummer Limo i Västerås & Örebro",
      summary: "Från motorträffar och sommarcruising i Västerås till slottsbröllop, företagsfester, svensexor och studentbaler i Örebro – vi levererar 10 meter ren show hela vägen fram till entrén.",
      popularFor: "Bilträffar, Svensexa/Möhippa, Företagsevent & Helg-VIP (från ca 470 kr/pers vid 16 pers)",
      pickupExample: "Västerås / Örebro"
    },
    {
      slug: "gavle-hela-sverige",
      city: "Gävle, Sandviken & Hela Sverige",
      regionTag: "RIKSTÄCKANDE EVENT & FESTIVAL",
      headline: "Gävleborg, Sweden Rock, Elmia & Uppdrag i Hela Sverige",
      summary: "Vi kör regelbundet i Gävle, Sandviken och Ludvika samt rullar ut i hela landet för festivaler (Sweden Rock m.fl.), mässor, sponsorevent och Oktoberfest-resor tur och retur!",
      popularFor: "Festivalveckor, Sponsorevent i hela landet & Oktoberfest-resa (20 000 kr/pers, min 16 st)",
      pickupExample: "Gävle / Sandviken / Enligt överenskommelse"
    }
  ],

  // --------------------------------------------------------------------------
  // FORDONSLISTA
  // --------------------------------------------------------------------------
  cars: [
    {
      id: "hummer-h2-legends-of-rock",
      name: "Hummer H2 Limousine – ”Legends of Rock”",
      badge: "FLAGGSKEPPET · 10 METER · UPP TILL 16 PASSAGERARE",
      status: "available",
      price: "Vardag 5 500 kr/h · Helg 7 500 kr/h · Heldag (12 h) 25 000 kr · Sponsorevent från 50 000 kr/dag",
      shortIntro:
        "Sveriges mest omtalade 10-meters hårdrocks-limousine med plats för upp till 16 passagerare – lackerad av legendariske Håkan ”Dr H Custom” Andersson och hyllad på Elmia & Vallåkraträffen.",
      description:
        "Det här är ingen vanlig vit limousine. Med 10 meter attityd, plats för upp till 16 personer (lika mäktig även för mindre sällskap på 6–12 vänner!) och en helt unik custom-airbrush med Iron Maiden, AC/DC, Ozzy Osbourne (Crazy Train) och Motörhead stjäl ni hela showen. Invändigt väntar en rymlig VIP-lounge med skinnsoffor, LED-ljus, upplyst bar och tungt klubbljudsystem. Observera att vi ej bjuder på eller serverar alkoholhaltiga drycker.",
      specs: [
        { label: "Längd & Kapacitet", value: "10,0 m · Upp till 16 pers" },
        { label: "Vardagspris", value: "5 500 kr / timme" },
        { label: "Helgpris", value: "7 500 kr / timme" },
        { label: "Heldag (12 h)", value: "25 000 kr" },
        { label: "Sponsorevent", value: "Från 50 000 kr/dag + lunch, hotell & drivmedel" },
        { label: "Oktoberfest T&R", value: "20 000 kr/pers (min 16 st, 18+)" }
      ],
      features: [
        "Rymmer upp till 16 passagerare – från ca 345 kr/pers (vardag) eller ca 470 kr/pers (helg) vid full bil!",
        "Unik handmålad motivlack på båda sidor (Iron Maiden, AC/DC, Ozzy Osbourne & Motörhead)",
        "Kraftfullt fest- & konsertljudsystem med tung bas och Bluetooth för egen Spotify-lista",
        "Exklusiv VIP-lounge med skinnsoffor, LED-ljus och upplyst bar (obs: vi serverar/bjuder ej på alkohol)",
        "Perfekt för 3 kvällspass, bröllop, bal/studentutskott, musikvideor, B2B-sponsorevent & Oktoberfest"
      ],
      mainImage: {
        src: "bilder/bilar/hummer-legends-sida.jpg",
        caption: "Hummer H2 Limousine 'Legends of Rock' – 10 meter hårdrock på hjul"
      },
      images: [
        {
          src: "bilder/bilar/hummer-legends-sida.jpg",
          caption: "Förarsidan vid Svaneholms slott: Iron Maiden, Legends of Rock & AC/DC"
        },
        {
          src: "bilder/bilar/hummer-ozzy-motorhead-front.jpg",
          caption: "Passagerarsidan: Ozzy Osbourne 'Crazy Train' & Motörhead i eldsflammor"
        },
        {
          src: "bilder/bilar/hummer-interior-bar.jpg",
          caption: "VIP-loungen invändigt – skinnsoffor, LED-ljus, bar & dubbla baslådor"
        },
        {
          src: "bilder/bilar/hummer-iron-maiden-detalj.jpg",
          caption: "Detaljbild på Håkan 'Dr H Custom' Anderssons airbrush-konst"
        }
      ]
    },
    {
      id: "kommande-vip-fordon",
      name: "Större Sällskap, Festivalveckor & Företagsupplägg",
      badge: "B2B · STUDENTUTSKOTT · OKTOBERFEST",
      status: "coming_soon",
      price: "Skräddarsydd offert · Sponsorevent · Oktoberfest T&R",
      shortIntro:
        "Planerar ni ett större företagsevent, musikvideoinspelning, hel studentvecka eller Oktoberfest-resa för minst 16 personer (18+)? Vi skräddarsyr hela upplägget!",
      description:
        "Vid större sponsorevent, mässor, studentutskott och specialresor som Oktoberfest tur & retur samordnar vi tider, rutter och visningar efter era önskemål.",
      specs: [
        { label: "Sponsorevent", value: "Från 50 000 kr/dag + lunch, hotell & drivmedel" },
        { label: "Oktoberfest T&R", value: "20 000 kr/pers (min 16 st, 18 år)" },
        { label: "Chaufför", value: "Ingår alltid" },
        { label: "Område", value: "Hela Sverige & Europa-special" }
      ],
      features: [
        "Sponsorevent med maximal varumärkesexponering, VIP-visningar & kundåkturer",
        "Oktoberfest tur & retur: 20 000 kr/person (minst 16 st, 18 år) – lunch under färd ingår (ej på plats), logi/boende ingår ej"
      ],
      mainImage: {
        src: "bilder/bilar/kommande-vip-limo.jpg",
        caption: "Backstage Wheels – Sponsorevent, B2B & Specialresor"
      },
      images: [
        {
          src: "bilder/bilar/kommande-vip-limo.jpg",
          caption: "Backstage Wheels – Sponsorevent, B2B & Specialresor"
        }
      ]
    }
  ],

  // --------------------------------------------------------------------------
  // MERCH-KOLLEKTION (Visas som "Kommer snart – Se design & anmäl intresse"!)
  // Kan fyllas på & redigeras fritt i den gömda kontrollpanelen!
  // --------------------------------------------------------------------------
  defaultMerch: [
    {
      id: "merch-tour-tshirt",
      name: "Backstage Wheels – ”Legends Tour” T-Shirt",
      price: 349,
      currency: "kr",
      badge: "DESIGN #1 · KOMMER SNART",
      stockStatus: "coming_soon",
      sizes: ["S", "M", "L", "XL", "XXL"],
      image: "bilder/merch/backstage-tshirt.jpg",
      description:
        "Kraftig svart rock-t-shirt i 100 % kammad bomull med vårt vektoriserade sköldemblem på bröstet och 10M Limo-turnétryck på ryggen. Rösta/anmäl intresse om du vill ha denna i första släppet!"
    },
    {
      id: "merch-vip-hoodie",
      name: "Backstage Wheels – VIP Heavy Hoodie",
      price: 699,
      currency: "kr",
      badge: "DESIGN #2 · KOMMER SNART",
      stockStatus: "coming_soon",
      sizes: ["S", "M", "L", "XL", "XXL"],
      image: "bilder/merch/backstage-hoodie.jpg",
      description:
        "Tjock huvtröja med borstad insida, känguruficka och eldigt Backstage Wheels-tryck fram och bak. Markera ditt intresse nedan för att säkra din storlek!"
    },
    {
      id: "merch-trucker-cap",
      name: "Backstage Wheels – 3D-Broderad Trucker-Keps",
      price: 299,
      currency: "kr",
      badge: "DESIGN #3 · KOMMER SNART",
      stockStatus: "coming_soon",
      sizes: ["One Size (Justerbar)"],
      image: "bilder/merch/backstage-keps.jpg",
      description:
        "Svart snapback/trucker-keps med ventilerande nät baktill och kraftig 3D-brodyr framtill. Klicka på Intresserad så ser vi hur många vi ska ta hem!"
    }
  ],

  // --------------------------------------------------------------------------
  // STANDARDKALENDER
  // --------------------------------------------------------------------------
  defaultCalendar: [
    {
      id: "cal-2026-11-27",
      date: "2026-11-27",
      endDate: "2026-11-27",
      kind: "booking",
      availability: "partial",
      timeSlot: "Pass 1 (17:30–20:00) Bokad · Pass 2 & Pass 3 LEDIGA!",
      publicTitle: "Företags-AW bokad tidig kväll – Kvälls- & nattpass lediga!",
      location: "Borlänge / Falun"
    },
    {
      id: "cal-2026-11-28",
      date: "2026-11-28",
      endDate: "2026-11-28",
      kind: "booking",
      availability: "booked",
      timeSlot: "Alla 3 kvällspass bokade",
      publicTitle: "Fullbokad (Svensexa & Konsertkörning)",
      location: "Dalarna"
    },
    {
      id: "cal-2026-12-04",
      date: "2026-12-04",
      endDate: "2026-12-04",
      kind: "booking",
      availability: "partial",
      timeSlot: "Pass 1 Bokad · Pass 2 (20:30) & Pass 3 (23:00) LEDIGA!",
      publicTitle: "Julbordstransport bokad – Senare kvällspass lediga!",
      location: "Leksand / Rättvik"
    },
    {
      id: "cal-2026-12-05",
      date: "2026-12-05",
      endDate: "2026-12-05",
      kind: "booking",
      availability: "booked",
      timeSlot: "Helkväll bokad",
      publicTitle: "Fullbokad (Julgala & VIP-körning)",
      location: "Falun"
    },
    {
      id: "cal-2026-12-12",
      date: "2026-12-12",
      endDate: "2026-12-12",
      kind: "event",
      availability: "partial",
      timeSlot: "16:00–01:30 · Pass 1 & Pass 3 kvar",
      publicTitle: "Lucia Rock & Vinter-Cruising",
      location: "Dalarna",
      description: "Upplev Legends of Rock i vintermörkret! Ett tidigt och ett sent sällskapspass finns kvar att boka."
    },
    {
      id: "cal-2026-12-31",
      date: "2026-12-31",
      endDate: "2026-12-31",
      kind: "event",
      availability: "partial",
      timeSlot: "Nyårsafton · Tidigt middagspass 17:00–19:30 LEDIGT",
      publicTitle: "Nyårsafton VIP i Hummer Limo",
      location: "Mellansverige / Enligt bokning",
      description: "Fira in det nya året som äkta rockstjärnor! Tolvslagspasset är bokat, men tidiga nyårsmiddagspasset är fortfarande ledigt."
    },
    {
      id: "ev-elmia-2027",
      date: "2027-03-26",
      endDate: "2027-03-29",
      kind: "event",
      availability: "partial",
      timeSlot: "Påskhelgen · Sponsorevent & Kvällspass",
      publicTitle: "Custom Motor Show – Elmia Jönköping",
      location: "Jönköping (Elmia)",
      description: "Träffa oss på Nordens största motormässa i påsk! Möjlighet att boka sponsorexponering eller kvällskörningar."
    },
    {
      id: "ev-bal-student-2027",
      date: "2027-05-20",
      endDate: "2027-06-12",
      kind: "event",
      availability: "partial",
      timeSlot: "Maj–Juni · Högtryck för studentutskott & bal!",
      publicTitle: "Bal- & Studentveckorna 2027",
      location: "Dalarna & Hela Sverige",
      description: "Vårens mest efterfrågade datum! Vi kör flera bal- och studentpass per dag – studentutskott kan även boka heldag (25 000 kr)."
    },
    {
      id: "ev-sweden-rock-2027",
      date: "2027-06-09",
      endDate: "2027-06-12",
      kind: "event",
      availability: "partial",
      timeSlot: "Festivaldagar · VIP & Sponsorevent",
      publicTitle: "Sweden Rock Festival – Backstage VIP",
      location: "Sölvesborg / Blekinge",
      description: "Hårdrocks-Hummern på hemmaplan! Boka VIP-entré, heldagspaket (12 h) eller sponsorevent under festivalveckan."
    },
    {
      id: "ev-oktoberfest-2027",
      date: "2027-09-18",
      endDate: "2027-10-03",
      kind: "event",
      availability: "partial",
      timeSlot: "Specialresa Tur & Retur · Minst 16 pers · 18+",
      publicTitle: "Oktoberfest VIP-Resa Tur & Retur",
      location: "Tur & Retur i Hårdrocks-Hummern",
      description: "Exklusiv gruppresa tur & retur till Oktoberfest! 20 000 kr per person, minst 16 personer i sällskapet, åldersgräns 18 år. Lunch under färd ingår (ej på plats), boende/logi ingår ej."
    }
  ],

  // --------------------------------------------------------------------------
  // STANDARDINLÄGG (När nya inlägg finns blinkar/pulserar Inläggsfliken i guld!)
  // --------------------------------------------------------------------------
  defaultPosts: [
    {
      id: "post-nyhet-oktoberfest-och-merch-2026",
      createdAt: "2026-11-25 21:00",
      title: "NYHET: Oktoberfest-resa, Kvällens 3 Pass & Kommande Merch! 🔥",
      text: "Nu släpper vi bokningen för vår exklusiva Oktoberfest-resa tur & retur (20 000 kr/person, minst 16 st, 18-årsgräns) samt våra smarta kvällspass där upp till 16 vänner delar på notan – från under 490 kr per person vid full bil! Spana även in fliken Merch (Kommer snart) och rösta på vilken design vi ska trycka först.",
      hashtags: "#backstagewheels #oktoberfest #hummerlimo #hyralimousine #merch #legendsofrock",
      sharedTo: ["Instagram", "Facebook"],
      media: [
        {
          src: "bilder/bilar/hummer-legends-sida.jpg",
          thumb: "bilder/bilar/hummer-legends-sida.jpg",
          type: "image",
          caption: "10 meter Hummer H2 'Legends of Rock' – redo för kvällspass, sponsorevent & Oktoberfest!"
        }
      ]
    },
    {
      id: "post-video-showcase-2026",
      createdAt: "2026-11-20 19:30",
      title: "10 Meter Hårdrock på Rull – Se Videoklippet!",
      text: "Dra upp volymen! Nu är bokningen öppen för julbord, nyår, vårens studentutskott och baler, musikvideoinspelningar, B2B-sponsorevent och sommarens festivaler 2027. Registrera din e-post så får du nya inlägg och kampanjerbjudanden automatiskt!",
      hashtags: "#backstagewheels #legendsofrock #hyralimousine #dalarna #stockholm #swedenrock",
      sharedTo: ["Instagram", "Facebook"],
      media: [
        {
          src: "bilder/galleri/sweden-rock-festivaler/00-backstage-wheels-showcase-video.mp4",
          thumb: "bilder/bilar/hummer-legends-sida.jpg",
          type: "video",
          caption: "Backstage Wheels – 10-meters Hummer H2 Limousine i rörelse"
        }
      ]
    },
    {
      id: "post-vallakra-showstopper",
      createdAt: "2026-09-14 16:15",
      title: "Publiksuccé på Elmia & Vallåkraträffen",
      text: "Tusen tack till alla som kom fram och fotade Håkan 'Dr H' Anderssons magiska motivlack med Iron Maiden, AC/DC, Ozzy och Motörhead. Kolla in mapparna under Bildgalleri för närbilder i helskärm!",
      hashtags: "#drhcustoms #vallåkraträffen #elmia #hummerh2 #motivlack #backstagewheels",
      sharedTo: ["Instagram", "Facebook"],
      media: [
        {
          src: "bilder/galleri/svaneholm-dr-h-custom/02-hummer-ozzy-motorhead-svaneholm.jpg",
          thumb: "bilder/galleri/svaneholm-dr-h-custom/02-hummer-ozzy-motorhead-svaneholm.jpg",
          type: "image",
          caption: "Ozzy Osbourne 'Crazy Train' & Motörhead – airbrush i världsklass"
        }
      ]
    }
  ],

  // --------------------------------------------------------------------------
  // VANLIGA FRÅGOR (SEO FAQ)
  // --------------------------------------------------------------------------
  seoFaq: [
    {
      q: "Vad kostar det per timme och per person att hyra limousinen?",
      a: "Vardagspriset (måndag–torsdag) är 5 500 kr/timme och helgpriset (fredag–söndag) är 7 500 kr/timme. Bilen rymmer upp till 16 passagerare – är ni full bil på 16 personer blir kostnaden bara ca 344 kr/person på vardagar och ca 469 kr/person (under 490 kr!) på helger. Bilen behöver såklart inte vara full: även för 8–12 personer blir det en riktigt prisvärd VIP-upplevelse. Heldag (12 h) kostar 25 000 kr."
    },
    {
      q: "Vad innebär Sponsorevent och vad kostar det?",
      a: "Sponsorevent & Varumärkesdag kostar från 50 000 kr per dag + lunch och hotell och drivmedel. Ni får Sveriges mest fotograferade blickfång vid lanseringar, mässor, invigningar och festivaler inklusive VIP-visningar och kundåkturer – bokningsbart för enstaka dagar eller hela festivalveckor."
    },
    {
      q: "Hur fungerar Oktoberfest-resan och vad ingår?",
      a: "Vi erbjuder en exklusiv VIP-resa till och från Oktoberfest för 20 000 kr per person. Bokningen gäller för sällskap på minst 16 personer och har 18-årsgräns. Lunch under själva resan (under färd) ingår, men ej mat/lunch på plats. Boende/logi ingår ej, och observera att vi ej serverar eller bjuder på alkoholhaltiga drycker."
    },
    {
      q: "Ingår eller serveras alkoholhaltiga drycker i limousinen?",
      a: "Nej, vi bjuder inte på och serverar inte alkoholhaltiga drycker i limousinen. I kupéns upplysta bar finns däremot is-/kylutrymme och glashållare till sällskapets förfogande."
    },
    {
      q: "Kan man boka bilen för musikvideo, B2B-reklam eller via studentutskott?",
      a: "Absolut! Bilens unika customlack av Dr H Custom gör den extremt eftertraktad till musikvideor, reklamfilmer, företagsevent och studentutskott som vill boka flera pass på raken under bal- och studentveckorna."
    }
  ],

  defaultGalleryFolders: [
    {
      slug: "sweden-rock-festivaler",
      name: "Sweden Rock & Festivaler",
      date: "2026",
      description: "VIP-körningar, videoklipp och kvällsstämning från rockfestivaler."
    },
    {
      slug: "vallakra-elmia-traffar",
      name: "Vallåkraträffen & Elmia",
      date: "2026",
      description: "Mässans och bilträffarnas stora publikfavorit – 10 meter Hummer H2."
    },
    {
      slug: "svaneholm-dr-h-custom",
      name: "Svaneholms Slott & Dr H Custom",
      date: "2026",
      description: "Fotografering vid Svaneholms slott och närbilder på Dr H Customs airbrush."
    },
    {
      slug: "vip-bar-interior",
      name: "VIP-Lounge, Bar & Ljud",
      date: "2026",
      description: "Skinnsoffor, LED-ljus, upplyst VIP-bar och kraftfullt ljudsystem inuti limousinen."
    }
  ],

  fallbackGallery: [
    {
      src: "bilder/galleri/sweden-rock-festivaler/00-backstage-wheels-showcase-video.mp4",
      thumb: "bilder/bilar/hummer-legends-sida.jpg",
      title: "Backstage Wheels – Showcase Videoklipp",
      type: "video",
      folderSlug: "sweden-rock-festivaler",
      folderName: "Sweden Rock & Festivaler"
    },
    {
      src: "bilder/galleri/sweden-rock-festivaler/04-backstage-festival-kvall.jpg",
      title: "VIP-entré i kvällsljus",
      type: "image",
      folderSlug: "sweden-rock-festivaler",
      folderName: "Sweden Rock & Festivaler"
    },
    {
      src: "bilder/galleri/vallakra-elmia-traffar/01-hummer-legends-of-rock-helbild.jpg",
      title: "Hummer H2 'Legends of Rock' – 10 meter profil",
      type: "image",
      folderSlug: "vallakra-elmia-traffar",
      folderName: "Vallåkraträffen & Elmia"
    },
    {
      src: "bilder/galleri/vallakra-elmia-traffar/06-iron-maiden-airbrush-detalj.jpg",
      title: "Iron Maiden & Blixtar – Frontskärm",
      type: "image",
      folderSlug: "vallakra-elmia-traffar",
      folderName: "Vallåkraträffen & Elmia"
    },
    {
      src: "bilder/galleri/svaneholm-dr-h-custom/02-hummer-ozzy-motorhead-svaneholm.jpg",
      title: "Ozzy 'Crazy Train' & Motörhead vid Svaneholms slott",
      type: "image",
      folderSlug: "svaneholm-dr-h-custom",
      folderName: "Svaneholms Slott & Dr H Custom"
    },
    {
      src: "bilder/galleri/svaneholm-dr-h-custom/03-dr-h-custom-motivlackering.jpg",
      title: "Närbild på Dr H Customs airbrush-lackering",
      type: "image",
      folderSlug: "svaneholm-dr-h-custom",
      folderName: "Svaneholms Slott & Dr H Custom"
    },
    {
      src: "bilder/galleri/vip-bar-interior/05-ljudsystem-vip-lounge.jpg",
      title: "Klubbljud & belysning inne i kupén",
      type: "image",
      folderSlug: "vip-bar-interior",
      folderName: "VIP-Lounge, Bar & Ljud"
    },
    {
      src: "bilder/galleri/vip-bar-interior/07-hummer-vip-bar-interior.jpg",
      title: "Upplyst bar & skinnsoffor i kupén",
      type: "image",
      folderSlug: "vip-bar-interior",
      folderName: "VIP-Lounge, Bar & Ljud"
    }
  ],

  gallery: {
    folderPath: "bilder/galleri",
    phpEndpoint: "api/gallery.php",
    nodeEndpoint: "/api/gallery"
  }
};
