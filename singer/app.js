// ========= CONFIG =========
    // Replace with real WhatsApp number (country code, no +), e.g. "919876543210"
    const WHATSAPP_NUMBER = "919000000000";
    // Replace with real email if you want mailto
    const CONTACT_EMAIL = "ranjanaroy.singer@example.com";

    // ========= i18n dictionary =========
    const I18N = {
      en: {
        subtitle: "Bhojpuri & Hindi Singer • Varanasi • Live Functions & Festivals",
        nav_bio: "Biography",
        nav_services: "Services",
        nav_festivals: "Festivals & Functions",
        nav_packages: "Packages",
        nav_book: "Book Now",

        kicker: "Live singing that feels like home",
        hero_line2: "Bhojpuri & Hindi",
        hero_city: "Varanasi",
        hero_desc:
          "A warm, graceful voice for your most precious moments — weddings, childbirth ceremonies, family functions, and Hindu festivals. Ranjana brings a soulful mix of traditional Bhojpuri lok-geet and beloved Hindi melodies, creating an atmosphere where everyone smiles, sings along, and remembers.",
        cta_book: "✨ Book a Performance",
        cta_whatsapp: "💬 WhatsApp Enquiry",
        cta_read: "📖 Read Festivals & Functions",

        b1a: "Lady Singer", b1b: "Stage & Home Events",
        b2a: "Festivals", b2b: "Bhajans • Devotional",
        b3a: "Shaadi", b3b: "Mehendi • Sangeet",
        b4a: "Childbirth", b4b: "Godh Bharai • Chhathi",

        style_title: "Performance Style",
        style_desc: "Soft devotional → playful folk → emotional classics. Always clean, family-friendly and joyful.",
        q_lang: "Languages", q_lang_v: "Bhojpuri • Hindi",
        q_events: "Events", q_events_v: "Marriage • Childbirth • Festivals",
        q_area: "Area", q_area_v: "Varanasi + nearby",
        tip: "Tip: Share your event date, venue, timing, and audience type. We’ll suggest a perfect setlist.",
        promise_title: "What you’ll feel",
        promise_desc: "A comforting, celebratory atmosphere — where elders feel respected, children stay happy, and everyone enjoys together.",
        note_label: "Note:",
        note_text: "Add your phone number / email later. This template is ready for launch.",

        bio_head: "Biography",
        bio_sub: "A short story — simple, warm, and trustworthy.",
        bio_cta: "📅 Check Availability",
        bio_title: "Ranjana Roy (Varanasi)",
        bio_text:
          "Ranjana Roy is a lady singer from Varanasi known for her soulful Bhojpuri folk and heartfelt Hindi songs. Her performances are designed for family gatherings — weddings, childbirth ceremonies, and Hindu festivals — where music is not just entertainment, but a way to bless, celebrate, and connect generations. With a respectful stage presence and a sweet, powerful voice, she brings a “ghar-jaisa” warmth to every event.",
        bio_what_head: "What she focuses on",
        bio_p1h: "Clean, family-friendly lyrics", bio_p1t: "So every age group can enjoy together.",
        bio_p2h: "Traditional + popular balance", bio_p2t: "Lok-geet, rituals songs, bhajans, and classics.",
        bio_p3h: "Occasion-wise setlists", bio_p3t: "Songs aligned to rituals, emotions, and moment timing.",

        services_head: "Services",
        services_sub: "From intimate family moments to grand celebrations.",
        services_cta: "📅 Check Availability",
        svc1h: "Marriage Functions",
        svc1t: "Mehendi, Sangeet, Shaadi, Reception — Bhojpuri folk + Hindi classics that keep the family engaged and happy.",
        svc2h: "Childbirth Ceremonies",
        svc2t: "Godh Bharai, Chhathi, naming ceremony — gentle, auspicious songs with a warm, respectful tone.",
        svc3h: "Hindu Festivals",
        svc3t: "Navratri, Diwali, Holi, Janmashtami, Shivratri and more — devotional + celebration sets.",

        ff_head: "Festivals & Functions — Meaning & Importance",
        ff_sub: "Why we celebrate, and how music makes it complete.",
        ff_copy: "💬 Copy WhatsApp Booking Message",
        ff_tag_family: "Family Celebration",
        ff_tag_blessing: "Blessing",
        ff_tag_auspicious: "Auspicious",
        ff_tag_bhakti: "Bhakti",
        ff_tag_light: "Light & Prosperity",
        ff_tag_joy: "Joy",
        ff_tag_krishna: "Krishna Bhakti",
        ff_tag_shiv: "Shiva Bhakti",

        ff_wed_h: "Weddings (Mehendi • Sangeet • Shaadi)",
        ff_wed_t:
          "In our culture, wedding music is not “background”—it is a blessing. It brings families together, reduces stress, and turns rituals into memories. Good songs keep the mood joyful, respectful, and connected across generations.",
        ff_wed_p1h: "Importance", ff_wed_p1t: "Creates warmth, laughter, and togetherness during rituals and entries.",
        ff_wed_p2h: "Singing style", ff_wed_p2t: "Bhojpuri vivah-geet, playful folk, and Hindi classics (clean lyrics).",
        ff_wed_p3h: "Best moments", ff_wed_p3t: "Bride/groom entry, mehendi vibes, ritual pauses, family rounds.",

        ff_godh_h: "Godh Bharai (Baby Shower)",
        ff_godh_t:
          "Godh Bharai is a celebration of motherhood and protection. The songs are soft, auspicious, and full of blessings. Music keeps the gathering gentle and emotionally warm—especially for elders and mothers.",
        ff_godh_p1h: "Importance", ff_godh_p1t: "Auspicious atmosphere for prayers, love, and family blessings.",
        ff_godh_p2h: "Singing style", ff_godh_p2t: "Soft Bhojpuri sanskar geet + sweet Hindi blessing songs.",
        ff_godh_p3h: "Mood", ff_godh_p3t: "Respectful, soothing, and family-friendly.",

        ff_chhathi_h: "Chhathi / Naming Ceremony",
        ff_chhathi_t:
          "These ceremonies welcome the baby into the family and community. Traditional songs express gratitude and hope, and create a sacred yet joyful ambience that everyone remembers for years.",
        ff_chhathi_p1h: "Importance", ff_chhathi_p1t: "Celebrates new life, protection, and blessings from elders.",
        ff_chhathi_p2h: "Singing style", ff_chhathi_p2t: "Traditional Bhojpuri ritual songs + light devotional Hindi set.",
        ff_chhathi_p3h: "Audience", ff_chhathi_p3t: "Perfect for family circles with elders, kids, and guests.",

        ff_nav_h: "Navratri",
        ff_nav_t:
          "Navratri is about strength, devotion, and inner purity. Devotional music elevates the space, helps people focus, and turns a gathering into a spiritual celebration.",
        ff_nav_p1h: "Importance", ff_nav_p1t: "Devotion to Maa Durga—faith, discipline, and positive energy.",
        ff_nav_p2h: "Singing style", ff_nav_p2t: "Bhajans, aarti-style songs, and gentle festive rhythms.",
        ff_nav_p3h: "Best setup", ff_nav_p3t: "Pooja stage, small speaker setup, call-and-response with audience.",

        ff_diw_h: "Diwali / Lakshmi Pooja",
        ff_diw_t:
          "Diwali celebrates the victory of light over darkness. Music during Lakshmi Pooja adds calm, grace, and devotion—and after the puja, soft festive songs keep the family mood sweet and together.",
        ff_diw_p1h: "Importance", ff_diw_p1t: "Faith, prosperity, gratitude, and family bonding.",
        ff_diw_p2h: "Singing style", ff_diw_p2t: "Aarti set + devotional classics + light festive melodies.",
        ff_diw_p3h: "Mood", ff_diw_p3t: "Peaceful, auspicious, and joyful (family-friendly).",

        ff_holi_h: "Holi",
        ff_holi_t:
          "Holi is about laughter, togetherness, and letting go of negativity. Good Holi music should be energetic yet clean, so the whole family can celebrate without discomfort.",
        ff_holi_p1h: "Importance", ff_holi_p1t: "Community bonding—fun, forgiveness, and fresh beginnings.",
        ff_holi_p2h: "Singing style", ff_holi_p2t: "Clean Holi set + folk rhythms + interactive claps.",
        ff_holi_p3h: "Audience", ff_holi_p3t: "Works great in courtyards and society gatherings.",

        ff_jan_h: "Janmashtami",
        ff_jan_t:
          "Janmashtami celebrates Shri Krishna’s birth—joy, playfulness, and divine love. Devotional songs here create a sweet, musical “Vrindavan-like” feeling in the gathering.",
        ff_jan_p1h: "Importance", ff_jan_p1t: "Devotion, celebration, and spiritual happiness in the home.",
        ff_jan_p2h: "Singing style", ff_jan_p2t: "Krishna bhajans, aarti, and gentle festive compositions.",
        ff_jan_p3h: "Best moments", ff_jan_p3t: "Midnight aarti, dahi-handi vibe, and bhajan rounds.",

        ff_shiv_h: "Mahashivratri",
        ff_shiv_t:
          "Mahashivratri is about meditation, surrender, and inner transformation. Bhajans and Shiva chants help people feel calm and connected, making the night spiritually powerful.",
        ff_shiv_p1h: "Importance", ff_shiv_p1t: "Faith, peace, and devotion—especially during night vigil.",
        ff_shiv_p2h: "Singing style", ff_shiv_p2t: "Shiv bhajans, aarti, and steady devotional rhythm.",
        ff_shiv_p3h: "Mood", ff_shiv_p3t: "Deep, calm, and spiritually uplifting.",

        pkg_head: "Packages",
        pkg_sub: "Simple options — customized after your event details.",
        pkg_cta: "💛 Get Quote",
        pkg1h: "Sweet Home Function",
        pkg1t: "60–90 mins • soft + devotional + folk mix • ideal for small gatherings.",
        pkg2h: "Wedding Celebration",
        pkg2t: "2–3 hrs • energetic + audience interaction • setlist aligned to rituals & entries.",
        pkg3h: "Festival Special",
        pkg3t: "1.5–2.5 hrs • bhajan + devotional classics • perfect spiritual ambience.",

        c_head: "Booking & Contact",
        c_sub: "Send details — we reply quickly with availability and quote.",
        c_copy: "💬 Copy WhatsApp Message",
        c_form: "Quick Enquiry Form",
        f_name: "Your Name",
        f_phone: "Phone / WhatsApp",
        f_event: "Event Type",
        f_sel: "Select…",
        f_e1: "Marriage / Sangeet / Reception",
        f_e2: "Childbirth Ceremony (Godh Bharai / Chhathi / Naming)",
        f_e3: "Hindu Festival / Pooja",
        f_e4: "Other Family Function",
        f_city: "City / Area",
        f_date: "Event Date + Time",
        f_msg: "Message",
        f_send: "✨ Send Enquiry",
        f_wa: "💬 Send on WhatsApp",
        f_note: "This form opens your email app (simple & reliable). WhatsApp sends instantly.",

        love_head: "Why Families Love Her",
        love1h: "Warm & Respectful", love1t: "Perfect for family gatherings — graceful voice and clean lyrics.",
        love2h: "Audience Connection", love2t: "Encourages claps and sing-alongs — without noise or discomfort.",
        love3h: "Occasion-perfect setlist", love3t: "Songs aligned to rituals, emotions, and timing — the event feels “set”.",
        edit_head: "Easy edits:", edit_text: "Change WhatsApp number + email in the script config and launch.",

        wa_bubble: "💬 WhatsApp: “Book Ranjana Roy for my function”",
        foot_line: "Varanasi • Bhojpuri & Hindi Singer • Weddings • Childbirth • Festivals",
        foot_built: "Built with ❤️ in Light-Saffron theme"
      },

      hi: {
        subtitle: "भोजपुरी और हिंदी गायिका • वाराणसी • फंक्शन व त्योहारों में लाइव गायन",
        nav_bio: "परिचय",
        nav_services: "सेवाएँ",
        nav_festivals: "त्योहार व फंक्शन",
        nav_packages: "पैकेज",
        nav_book: "बुक करें",

        kicker: "ऐसा गायन जो घर जैसा लगे",
        hero_line2: "भोजपुरी और हिंदी",
        hero_city: "वाराणसी",
        hero_desc:
          "आपके खास पलों के लिए एक मीठी और गरिमामय आवाज़ — शादी, बच्चे के संस्कार, पारिवारिक समारोह और हिंदू त्योहार। रंजना जी पारंपरिक भोजपुरी लोक-गीत और प्यारे हिंदी गीतों का सुंदर मेल प्रस्तुत करती हैं, जिससे माहौल अपनापन, मुस्कान और यादगार बन जाता है।",
        cta_book: "✨ परफॉर्मेंस बुक करें",
        cta_whatsapp: "💬 WhatsApp पर बात करें",
        cta_read: "📖 त्योहार/फंक्शन पढ़ें",

        b1a: "महिला गायिका", b1b: "स्टेज व घर के कार्यक्रम",
        b2a: "त्योहार", b2b: "भजन • भक्ति",
        b3a: "शादी", b3b: "मेहंदी • संगीत",
        b4a: "संस्कार", b4b: "गोध भराई • छठी",

        style_title: "गायन शैली",
        style_desc: "शांत भक्ति → प्यारे लोकगीत → भावुक क्लासिक्स। हमेशा परिवार के लिए शुद्ध व आनंददायक।",
        q_lang: "भाषाएँ", q_lang_v: "भोजपुरी • हिंदी",
        q_events: "कार्यक्रम", q_events_v: "शादी • संस्कार • त्योहार",
        q_area: "क्षेत्र", q_area_v: "वाराणसी व आसपास",
        tip: "टिप: तारीख, जगह, समय और ऑडियंस बताइए — हम आपके लिए सही सेट-लिस्ट सुझाएंगे।",
        promise_title: "आप क्या महसूस करेंगे",
        promise_desc: "एक सुकूनभरा, उत्सव जैसा माहौल — जहाँ बड़ों का सम्मान, बच्चों की खुशी और सबका साथ बना रहे।",
        note_label: "नोट:",
        note_text: "बाद में नंबर/ईमेल जोड़ दीजिए। यह टेम्पलेट लॉन्च के लिए तैयार है।",

        bio_head: "परिचय",
        bio_sub: "छोटा सा परिचय — सरल, प्यारा और भरोसेमंद।",
        bio_cta: "📅 उपलब्धता पूछें",
        bio_title: "रंजना रॉय (वाराणसी)",
        bio_text:
          "रंजना रॉय वाराणसी की एक लोकप्रिय महिला गायिका हैं, जिनका विशेष रुझान भोजपुरी लोकगीतों और भावपूर्ण हिंदी गीतों में है। इनके कार्यक्रम परिवार-केंद्रित होते हैं — शादी, बच्चे के संस्कार, और हिंदू त्योहार — जहाँ संगीत केवल मनोरंजन नहीं, बल्कि आशीर्वाद, उत्सव और पीढ़ियों को जोड़ने का माध्यम बनता है। सभ्य मंच प्रस्तुति और मधुर आवाज़ के साथ, रंजना जी हर आयोजन में “घर जैसा” अपनापन भर देती हैं।",
        bio_what_head: "इनकी खासियत",
        bio_p1h: "परिवार-उपयुक्त शब्द", bio_p1t: "हर उम्र के लोग साथ में आनंद ले सकें।",
        bio_p2h: "परंपरा + लोकप्रियता", bio_p2t: "लोकगीत, रस्मों के गीत, भजन और क्लासिक्स।",
        bio_p3h: "अवसर के अनुसार सेट", bio_p3t: "रस्म, भाव और समय के हिसाब से सही गीत।",

        services_head: "सेवाएँ",
        services_sub: "छोटे घरेलू कार्यक्रम से लेकर बड़े समारोह तक।",
        services_cta: "📅 उपलब्धता पूछें",
        svc1h: "शादी के कार्यक्रम",
        svc1t: "मेहंदी, संगीत, शादी, रिसेप्शन — भोजपुरी लोक + हिंदी क्लासिक्स, ताकि परिवार जुड़ा रहे।",
        svc2h: "बच्चे के संस्कार",
        svc2t: "गोध भराई, छठी, नामकरण — शांति और शुभता वाले गीत, सम्मानजनक अंदाज़ में।",
        svc3h: "हिंदू त्योहार",
        svc3t: "नवरात्रि, दिवाली, होली, जन्माष्टमी, शिवरात्रि आदि — भक्ति + उत्सव का सुंदर मेल।",

        ff_head: "त्योहार व फंक्शन — अर्थ और महत्व",
        ff_sub: "हम क्यों मनाते हैं, और संगीत इसे कैसे पूरा करता है।",
        ff_copy: "💬 WhatsApp बुकिंग संदेश कॉपी करें",
        ff_tag_family: "पारिवारिक उत्सव",
        ff_tag_blessing: "आशीर्वाद",
        ff_tag_auspicious: "शुभ",
        ff_tag_bhakti: "भक्ति",
        ff_tag_light: "प्रकाश व समृद्धि",
        ff_tag_joy: "खुशी",
        ff_tag_krishna: "कृष्ण भक्ति",
        ff_tag_shiv: "शिव भक्ति",

        ff_wed_h: "शादी (मेहंदी • संगीत • विवाह)",
        ff_wed_t:
          "हमारी संस्कृति में शादी का संगीत केवल “बैकग्राउंड” नहीं—यह आशीर्वाद है। यह परिवारों को जोड़ता है, तनाव कम करता है और रस्मों को यादगार बनाता है। सही गीत माहौल को आनंदमय और मर्यादित रखते हैं।",
        ff_wed_p1h: "महत्व", ff_wed_p1t: "रस्मों और एंट्री के समय अपनापन और उत्साह बनता है।",
        ff_wed_p2h: "गायन शैली", ff_wed_p2t: "भोजपुरी विवाह-गीत, प्यारे लोकगीत, और शुद्ध हिंदी क्लासिक्स।",
        ff_wed_p3h: "बेहतरीन पल", ff_wed_p3t: "एंट्री, मेहंदी का माहौल, रस्मों के बीच का समय, परिवार राउंड।",

        ff_godh_h: "गोध भराई",
        ff_godh_t:
          "गोध भराई मातृत्व, सुरक्षा और शुभता का उत्सव है। यहाँ के गीत कोमल और आशीर्वाद से भरे होते हैं। संगीत पूरे माहौल को सुकूनभरा और भावनात्मक रूप से सुंदर बनाता है।",
        ff_godh_p1h: "महत्व", ff_godh_p1t: "प्रार्थना, प्रेम और परिवार के आशीर्वाद का शुभ वातावरण।",
        ff_godh_p2h: "गायन शैली", ff_godh_p2t: "कोमल भोजपुरी संस्कार गीत + मीठे हिंदी शुभ गीत।",
        ff_godh_p3h: "मूड", ff_godh_p3t: "सम्मानजनक, शांत और परिवार-उपयुक्त।",

        ff_chhathi_h: "छठी / नामकरण",
        ff_chhathi_t:
          "ये संस्कार बच्चे का परिवार और समाज में स्वागत हैं। पारंपरिक गीत कृतज्ञता और आशा व्यक्त करते हैं, जिससे पवित्र और खुशी भरा माहौल बनता है।",
        ff_chhathi_p1h: "महत्व", ff_chhathi_p1t: "नए जीवन का स्वागत, सुरक्षा और बड़ों का आशीर्वाद।",
        ff_chhathi_p2h: "गायन शैली", ff_chhathi_p2t: "पारंपरिक भोजपुरी रस्मी गीत + हल्का भक्ति हिंदी सेट।",
        ff_chhathi_p3h: "ऑडियंस", ff_chhathi_p3t: "बड़े-बुजुर्ग, बच्चे और मेहमान—सबके लिए सही।",

        ff_nav_h: "नवरात्रि",
        ff_nav_t:
          "नवरात्रि शक्ति, भक्ति और आत्म-शुद्धि का पर्व है। भजन और आरती से वातावरण पवित्र होता है और लोगों का मन पूजा में टिकता है।",
        ff_nav_p1h: "महत्व", ff_nav_p1t: "माँ दुर्गा की भक्ति—अनुशासन और सकारात्मक ऊर्जा।",
        ff_nav_p2h: "गायन शैली", ff_nav_p2t: "भजन, आरती शैली के गीत और मधुर ताल।",
        ff_nav_p3h: "बेहतरीन सेटअप", ff_nav_p3t: "पूजा मंच, छोटा स्पीकर, और श्रोताओं के साथ रेस्पॉन्स।",

        ff_diw_h: "दिवाली / लक्ष्मी पूजा",
        ff_diw_t:
          "दिवाली प्रकाश की जीत का पर्व है। लक्ष्मी पूजा में भजन वातावरण को शांत और शुभ बनाते हैं। पूजा के बाद हल्के उत्सव गीत परिवार को जोड़कर रखते हैं।",
        ff_diw_p1h: "महत्व", ff_diw_p1t: "विश्वास, समृद्धि, कृतज्ञता और पारिवारिक बंधन।",
        ff_diw_p2h: "गायन शैली", ff_diw_p2t: "आरती सेट + भक्ति क्लासिक्स + हल्की फेस्टिव धुनें।",
        ff_diw_p3h: "मूड", ff_diw_p3t: "शांत, शुभ और खुशी भरा।",

        ff_holi_h: "होली",
        ff_holi_t:
          "होली हँसी, मिलन और नकारात्मकता छोड़ने का त्योहार है। होली का संगीत ऊर्जावान हो, पर शुद्ध और मर्यादित—ताकि परिवार को असुविधा न हो।",
        ff_holi_p1h: "महत्व", ff_holi_p1t: "सामुदायिक मेल—मस्ती, क्षमा और नई शुरुआत।",
        ff_holi_p2h: "गायन शैली", ff_holi_p2t: "शुद्ध होली सेट + लोक ताल + तालियाँ और इंटरैक्शन।",
        ff_holi_p3h: "ऑडियंस", ff_holi_p3t: "आँगन/सोसायटी कार्यक्रमों के लिए बेहतरीन।",

        ff_jan_h: "जन्माष्टमी",
        ff_jan_t:
          "जन्माष्टमी श्रीकृष्ण के जन्म का उत्सव है—आनंद, लीला और प्रेम। यहाँ भजन वातावरण को ‘वृंदावन जैसा’ मधुर बना देते हैं।",
        ff_jan_p1h: "महत्व", ff_jan_p1t: "भक्ति, उत्सव और घर में आध्यात्मिक आनंद।",
        ff_jan_p2h: "गायन शैली", ff_jan_p2t: "कृष्ण भजन, आरती और मधुर उत्सवी रचनाएँ।",
        ff_jan_p3h: "बेहतरीन पल", ff_jan_p3t: "मध्यरात्रि आरती, दही-हांडी, भजन राउंड।",

        ff_shiv_h: "महाशिवरात्रि",
        ff_shiv_t:
          "महाशिवरात्रि ध्यान, समर्पण और भीतर के परिवर्तन का पर्व है। शिव भजन और मंत्र लोगों को शांत और जुड़ा हुआ महसूस कराते हैं।",
        ff_shiv_p1h: "महत्व", ff_shiv_p1t: "भक्ति, शांति और रात्रि-जागरण की ऊर्जा।",
        ff_shiv_p2h: "गायन शैली", ff_shiv_p2t: "शिव भजन, आरती और स्थिर भक्ति ताल।",
        ff_shiv_p3h: "मूड", ff_shiv_p3t: "गहरा, शांत और आध्यात्मिक।",

        pkg_head: "पैकेज",
        pkg_sub: "सरल विकल्प — आपकी जानकारी के बाद कस्टमाइज़।",
        pkg_cta: "💛 कोट लें",
        pkg1h: "घरेलू कार्यक्रम",
        pkg1t: "60–90 मिनट • शांत + भक्ति + लोक • छोटे कार्यक्रम के लिए।",
        pkg2h: "शादी स्पेशल",
        pkg2t: "2–3 घंटे • ऊर्जा + इंटरैक्शन • रस्मों और एंट्री के अनुसार।",
        pkg3h: "त्योहार स्पेशल",
        pkg3t: "1.5–2.5 घंटे • भजन + भक्ति क्लासिक्स • पवित्र माहौल।",

        c_head: "बुकिंग व संपर्क",
        c_sub: "विवरण भेजें — हम जल्दी उपलब्धता और शुल्क बताएँगे।",
        c_copy: "💬 WhatsApp संदेश कॉपी करें",
        c_form: "त्वरित पूछताछ फॉर्म",
        f_name: "आपका नाम",
        f_phone: "फोन / WhatsApp",
        f_event: "कार्यक्रम प्रकार",
        f_sel: "चुनें…",
        f_e1: "शादी / संगीत / रिसेप्शन",
        f_e2: "संस्कार (गोध भराई / छठी / नामकरण)",
        f_e3: "हिंदू त्योहार / पूजा",
        f_e4: "अन्य पारिवारिक कार्यक्रम",
        f_city: "शहर / क्षेत्र",
        f_date: "तारीख + समय",
        f_msg: "संदेश",
        f_send: "✨ पूछताछ भेजें",
        f_wa: "💬 WhatsApp पर भेजें",
        f_note: "यह फॉर्म ईमेल ऐप खोलता है (सरल व भरोसेमंद)। WhatsApp तुरंत भेजता है।",

        love_head: "परिवार क्यों पसंद करता है",
        love1h: "गरिमामय व मधुर", love1t: "परिवार के लिए उत्तम — सभ्य प्रस्तुति और शुद्ध शब्द।",
        love2h: "श्रोताओं से जुड़ाव", love2t: "तालियाँ और साथ गुनगुनाहट — बिना शोर/असहजता के।",
        love3h: "अवसर-परफेक्ट सेट", love3t: "रस्म, भाव और टाइमिंग के हिसाब से सही गीत।",
        edit_head: "आसान बदलाव:",
        edit_text: "स्क्रिप्ट में WhatsApp नंबर + ईमेल बदलें और लॉन्च करें।",

        wa_bubble: "💬 WhatsApp: “मेरे कार्यक्रम के लिए रंजना रॉय जी बुक करना है”",
        foot_line: "वाराणसी • भोजपुरी व हिंदी गायिका • शादी • संस्कार • त्योहार",
        foot_built: "Light-Saffron थीम में ❤️ से बनाया गया"
      }
    };

    // ========= Helpers =========
    const $ = (id) => document.getElementById(id);
    const toast = (msg) => {
      const t = $("toast");
      t.textContent = msg;
      t.classList.add("show");
      clearTimeout(toast._t);
      toast._t = setTimeout(() => t.classList.remove("show"), 1600);
    };
    function waLink(message){
      const txt = encodeURIComponent(message);
      return `https://wa.me/${WHATSAPP_NUMBER}?text=${txt}`;
    }

    // ========= Apply language =========
    function applyLang(lang){
      const dict = I18N[lang] || I18N.en;
      document.documentElement.setAttribute("data-lang", lang);
      document.documentElement.setAttribute("lang", lang === "hi" ? "hi" : "en");

      // Replace text nodes for [data-i18n]
      document.querySelectorAll("[data-i18n]").forEach(el=>{
        const key = el.getAttribute("data-i18n");
        if (!key) return;
        const val = dict[key];
        if (typeof val === "string") el.textContent = val;
      });

      // Update placeholders for inputs/textarea
      if (lang === "hi") {
        $("name").placeholder = "जैसे: राहुल / प्रिया";
        $("phone").placeholder = "जैसे: 98XXXXXXXX";
        $("city").placeholder = "वाराणसी / आसपास…";
        $("date").placeholder = "जैसे: 21 फ़रवरी, शाम 7–9";
        $("msg").placeholder = "स्थल, मेहमानों की संख्या, गीत पसंद…";
      } else {
        $("name").placeholder = "e.g., Rahul / Priya";
        $("phone").placeholder = "e.g., 98XXXXXXXX";
        $("city").placeholder = "Varanasi / nearby…";
        $("date").placeholder = "e.g., 21 Feb, evening 7–9 PM";
        $("msg").placeholder = "Venue, audience size, any song preference…";
      }

      // Update WhatsApp floating link + bubble text
      const float = $("waFloat");
      const text = buildDefaultWhatsAppText(lang);
      float.href = waLink(text);

      // Persist
      try{ localStorage.setItem("rr_lang", lang); }catch(e){}
    }

    function buildDefaultWhatsAppText(lang){
      if (lang === "hi") {
        return `नमस्ते रंजना रॉय जी,
मुझे अपने कार्यक्रम के लिए आपको बुक करना है।

कार्यक्रम:
तारीख/समय:
स्थान:
शहर/क्षेत्र:
मेहमानों की संख्या:
भोजपुरी/हिंदी/भजन पसंद:

कृपया उपलब्धता और शुल्क बताइए।`;
      }
      return `Namaste Ranjana Roy ji,
I want to book you for a function.

Event:
Date/Time:
Venue:
City/Area:
Audience size:
Preference (Bhojpuri/Hindi/Bhajan):

Please share availability and charges.`;
    }

    // ========= Reveal on scroll =========
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if (e.isIntersecting) e.target.classList.add("show");
      });
    }, {threshold:0.12});
    document.querySelectorAll(".reveal").forEach(el=>io.observe(el));

    // ========= Init =========
    $("year").textContent = new Date().getFullYear();

    // Load saved language (default English)
    let lang = "en";
    try{
      const saved = localStorage.getItem("rr_lang");
      if (saved === "hi" || saved === "en") lang = saved;
    }catch(e){}
    $("langSel").value = lang;
    applyLang(lang);

    // Language change
    $("langSel").addEventListener("change", (e)=>{
      applyLang(e.target.value);
      toast(e.target.value === "hi" ? "भाषा बदली गई" : "Language changed");
    });

    // WhatsApp CTA
    $("ctaWhatsApp").onclick = ()=>{
      window.open($("waFloat").href, "_blank", "noopener");
    };

    // Copy messages
    $("copyMsg").onclick = async ()=>{
      const current = document.documentElement.getAttribute("data-lang") || "en";
      const msg = buildDefaultWhatsAppText(current);
      try{ await navigator.clipboard.writeText(msg); toast(current==="hi" ? "संदेश कॉपी हो गया" : "Message copied"); }
      catch{ prompt("Copy message:", msg); }
    };
    $("copyFFMsg").onclick = $("copyMsg").onclick;

    // Form WhatsApp
    $("formWhatsApp").onclick = ()=>{
      const current = document.documentElement.getAttribute("data-lang") || "en";
      const name = $("name").value.trim();
      const phone = $("phone").value.trim();
      const event = $("event").value.trim();
      const city = $("city").value.trim();
      const date = $("date").value.trim();
      const msg = $("msg").value.trim();

      const text = current === "hi"
        ? `नमस्ते रंजना रॉय जी,
मुझे अपने कार्यक्रम के लिए आपको बुक करना है।

नाम: ${name}
फोन: ${phone}
कार्यक्रम: ${event}
शहर/क्षेत्र: ${city}
तारीख/समय: ${date}

संदेश:
${msg}

कृपया उपलब्धता और शुल्क बताइए।`
        : `Namaste Ranjana Roy ji,
I want to book you for a function.

Name: ${name}
Phone: ${phone}
Event: ${event}
City/Area: ${city}
Date/Time: ${date}

Message:
${msg}

Please share availability and charges.`;

      window.open(waLink(text), "_blank", "noopener");
      toast(current==="hi" ? "WhatsApp खुल रहा है…" : "Opening WhatsApp…");
    };

    // Form mailto (simple)
    $("enquiryForm").addEventListener("submit", (e)=>{
      e.preventDefault();
      const current = document.documentElement.getAttribute("data-lang") || "en";
      const name = $("name").value.trim();
      const phone = $("phone").value.trim();
      const event = $("event").value.trim();
      const city = $("city").value.trim();
      const date = $("date").value.trim();
      const msg = $("msg").value.trim();

      const subject = encodeURIComponent(
        current==="hi" ? `बुकिंग पूछताछ — ${event} — ${city}` : `Booking Enquiry — ${event} — ${city}`
      );

      const body = encodeURIComponent(
        current==="hi"
          ? `नमस्ते रंजना रॉय जी,

बुकिंग विवरण:
नाम: ${name}
फोन/WhatsApp: ${phone}
कार्यक्रम: ${event}
शहर/क्षेत्र: ${city}
तारीख/समय: ${date}

संदेश:
${msg}

कृपया उपलब्धता और शुल्क बताइए।
धन्यवाद।`
          : `Namaste Ranjana Roy ji,

My booking details:
Name: ${name}
Phone/WhatsApp: ${phone}
Event: ${event}
City/Area: ${city}
Date/Time: ${date}

Message:
${msg}

Please share availability and charges.
Thank you.`
      );

      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      toast(current==="hi" ? "ईमेल खुल रहा है…" : "Opening email…");
    });

    // Smooth scroll for hash links
    document.querySelectorAll('a[href^="#"]').forEach(a=>{
      a.addEventListener("click", (e)=>{
        const href = a.getAttribute("href");
        if (!href || href === "#") return;
        e.preventDefault();
        history.pushState(null, "", href);
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({behavior:"smooth", block:"start"});
      });
    });


// ===== Dummy photo carousels =====
function initCarousels(){
  const carousels = document.querySelectorAll(".carousel");
  carousels.forEach((root)=>{
    const track = root.querySelector(".carTrack");
    const slides = track ? Array.from(track.querySelectorAll("img")) : [];
    const prev = root.querySelector(".carBtn.prev");
    const next = root.querySelector(".carBtn.next");
    const dotsWrap = root.querySelector(".carDots");

    if (!track || slides.length === 0) return;

    let i = 0;

    const dots = slides.map((_, idx)=>{
      const d = document.createElement("span");
      d.className = "carDot" + (idx===0 ? " active" : "");
      d.title = `Slide ${idx+1}`;
      d.addEventListener("click", ()=>go(idx));
      if (dotsWrap) dotsWrap.appendChild(d);
      return d;
    });

    function render(){
      track.style.transform = `translateX(${-i*100}%)`;
      dots.forEach((d, k)=>d.classList.toggle("active", k===i));
    }
    function go(n){
      i = (n + slides.length) % slides.length;
      render();
    }

    if (prev) prev.addEventListener("click", ()=>go(i-1));
    if (next) next.addEventListener("click", ()=>go(i+1));

    // swipe
    let sx = 0, dx = 0, down = false;
    root.addEventListener("pointerdown", (e)=>{ down=true; sx=e.clientX; dx=0; root.setPointerCapture(e.pointerId); });
    root.addEventListener("pointermove", (e)=>{ if(!down) return; dx = e.clientX - sx; });
    root.addEventListener("pointerup", ()=>{ 
      if(!down) return; down=false; 
      if (Math.abs(dx) > 45) go(i + (dx<0 ? 1 : -1));
    });

    // autoplay
    const autoplay = root.getAttribute("data-autoplay") === "true";
    if (autoplay && slides.length > 1){
      let t = setInterval(()=>go(i+1), 4200);
      root.addEventListener("mouseenter", ()=>clearInterval(t));
      root.addEventListener("mouseleave", ()=>{ t = setInterval(()=>go(i+1), 4200); });
      root.addEventListener("focusin", ()=>clearInterval(t));
      root.addEventListener("focusout", ()=>{ t = setInterval(()=>go(i+1), 4200); });
    }
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  try{ initCarousels(); }catch(e){}
});

