import { C, G, O, P, T, X, type GrammarTopic } from './types'

export const TOPICS_3: GrammarTopic[] = [
  {
    id: 'past-continuous',
    title: 'Geçmişte Süreklilik (Past Continuous)',
    subtitle: 'Past Continuous',
    level: 'A2–B1',
    emoji: '⏯️',
    summary: 'Geçmişte belli bir anda devam etmekte olan eylemler. was/were + fiil-ing. Sıklıkla Past Simple ile birlikte kullanılır.',
    formula: ['I/He/She/It + was + fiil-ing', 'You/We/They + were + fiil-ing', 'wasn’t / weren’t + fiil-ing · Was/Were + özne + fiil-ing?'],
    sections: [
      {
        heading: 'Ne zaman kullanılır?',
        body: ['• **Geçmişte belli bir anda süren eylem:** At 8 pm yesterday I **was watching** TV.', '• **Arka plan anlatımı:** The sun **was shining** and birds **were singing**.', '• **Aynı anda süren iki eylem (while):** I **was cooking** while he **was cleaning**.'],
        examples: [X('I was sleeping at midnight.', 'Gece yarısı uyuyordum.'), X('They were playing in the garden.', 'Bahçede oynuyorlardı.')]
      },
      {
        heading: 'when ve while',
        body: ['• Uzun süren eylem (Past Continuous) + araya giren kısa eylem (Past Simple).', '• I **was walking** home **when** it **started** to rain.', '• **While** I **was walking** home, I **saw** an old friend.'],
        examples: [X('The phone rang while I was having a shower.', 'Duş alırken telefon çaldı.'), X('She was reading when the lights went out.', 'Işıklar gittiğinde kitap okuyordu.')]
      }
    ],
    tips: ['Türkçedeki “-yordu” ekinin karşılığı.', 'when genelde kısa eylemin, while uzun eylemin önüne gelir.'],
    questions: [
      C('At 9 last night I ___ dinner.', ['was having', 'were having', 'had have', 'am having'], 0),
      C('They ___ football when it started to rain.', ['was playing', 'were playing', 'played', 'are playing'], 1),
      C('While I ___, the phone rang.', ['was cooking', 'cooked', 'cook', 'were cooking'], 0),
      C('She was reading when I ___.', ['was arriving', 'arrived', 'arrive', 'arriving'], 1, 'Araya giren kısa eylem → Past Simple.'),
      C('___ you sleeping when I called?', ['Was', 'Were', 'Did', 'Are'], 1),
      C('He ___ watching TV; he was studying.', ['wasn’t', 'weren’t', 'didn’t', 'isn’t'], 0),
      C('What ___ you doing at 10 o’clock?', ['was', 'were', 'did', 'are'], 1),
      G('I ___ (walk) to work when I saw the accident.', 'was walking'),
      G('We ___ (watch) a film at 8 pm.', 'were watching'),
      G('She ___ (not / listen) to the teacher.', ['wasn’t listening', 'was not listening']),
      G('While they ___ (talk), the bus came.', 'were talking'),
      G('It ___ (rain) all morning.', 'was raining'),
      G('The children ___ (sleep) when we got home.', 'were sleeping'),
      O('I was reading a book at midnight.', 'Gece yarısı kitap okuyordum.'),
      O('They were waiting for the bus when it started to snow.', 'Kar yağmaya başladığında otobüs bekliyorlardı.'),
      O('What were you doing yesterday at five?', 'Dün saat beşte ne yapıyordun?'),
      T('I were sleeping.', false, 'I was sleeping.'),
      T('They were playing cards.', true),
      T('While I cooked, he was watching TV.', false, 'While I was cooking, he was watching TV.', 'İki uzun eylem → ikisi de continuous (veya while + continuous).'),
      T('She was driving when she saw the deer.', true),
      T('Was you working yesterday?', false, 'Were you working yesterday?')
    ],
    pairs: [P('I', 'was'), P('you', 'were'), P('he', 'was'), P('they', 'were'), P('uzun eylem', 'Past Continuous'), P('araya giren eylem', 'Past Simple')],
    homework: [
      { task: 'Dün akşam saat 20:00’de evindeki herkesin ne yaptığını anlat (4 cümle) ve bir “when” cümlesi ekle.', sample: 'At 8 pm my father was reading the newspaper. My mother was talking on the phone. My sister was doing her homework. I was cooking pasta when the doorbell rang.' }
    ]
  },
  {
    id: 'present-perfect',
    title: 'Present Perfect',
    subtitle: 'have / has + V3',
    level: 'A2–B1',
    emoji: '✅',
    summary: 'Geçmişte olmuş ama etkisi/sonucu şimdiye bağlanan eylemler; deneyimler; şimdiye kadar süren durumlar.',
    formula: ['I/You/We/They + have + V3', 'He/She/It + has + V3', 'haven’t / hasn’t + V3 · Have/Has + özne + V3?'],
    sections: [
      {
        heading: 'Ne zaman kullanılır?',
        body: ['• **Deneyim (ever / never):** Have you **ever** been to Japan? I have **never** seen snow.', '• **Sonucu şimdi önemli:** I’ve **lost** my keys. (Şu an anahtarım yok.)', '• **Yeni olmuş (just / already / yet):** She’s **just** left. I’ve **already** eaten. Have you finished **yet**?', '• **Şimdiye kadar süren (for / since):** I’ve lived here **for** 5 years / **since** 2020.'],
        examples: [X('I have visited Paris twice.', 'Paris’i iki kez ziyaret ettim.'), X('He has broken his arm.', 'Kolunu kırdı (şu an kırık).'), X('We have known each other since school.', 'Okuldan beri birbirimizi tanırız.')]
      },
      {
        heading: 'Present Perfect mi, Past Simple mı?',
        body: ['• Belli bir geçmiş zaman varsa → **Past Simple**: I **saw** him **yesterday**.', '• Zaman belli değil / şimdiye bağlı → **Present Perfect**: I **have seen** him (bir ara, şimdiye kadar).', '❌ I have seen him yesterday.'],
        examples: [X('I went to Rome in 2019.', '2019’da Roma’ya gittim.'), X('I have been to Rome.', 'Roma’ya gittim / bulundum (deneyim).')]
      },
      {
        heading: 'for / since · been / gone',
        body: ['• **for** + süre: for two hours, for a week · **since** + başlangıç: since Monday, since 2015', '• **been to** = gidip dönmüş: She has been to London. **gone to** = gitmiş, hâlâ orada: She has gone to London.'],
        examples: [X('She has worked here for three years.', 'Üç yıldır burada çalışıyor.')]
      }
    ],
    tips: ['Türkçede tam karşılığı yok; “şimdiye kadar”, “daha yeni”, “-dır” ile düşün.', 'yesterday, last year, ago gördüğünde Present Perfect kullanma.'],
    questions: [
      C('I ___ to Italy three times.', ['have been', 'has been', 'was', 'have went'], 0),
      C('She ___ her homework yet.', ['hasn’t finished', 'haven’t finished', 'didn’t finished', 'not finished'], 0),
      C('___ you ever ___ sushi?', ['Did / eat', 'Have / eaten', 'Has / eaten', 'Have / ate'], 1),
      C('I ___ him yesterday.', ['have seen', 'saw', 'has seen', 'seen'], 1, 'yesterday → Past Simple.'),
      C('We have lived here ___ 2018.', ['for', 'since', 'ago', 'yet'], 1),
      C('They have been married ___ ten years.', ['since', 'for', 'ago', 'already'], 1),
      C('He has ___ left. You just missed him.', ['yet', 'just', 'ever', 'since'], 1),
      C('My sister isn’t here. She has ___ to the market.', ['been', 'gone', 'went', 'go'], 1),
      G('I ___ (lose) my phone. I can’t find it.', ['have lost', '’ve lost']),
      G('She ___ (never / see) the sea.', 'has never seen'),
      G('___ you finished the report yet?', 'Have'),
      G('He has worked here ___ five years.', 'for'),
      G('I have known her ___ we were children.', 'since'),
      G('We ___ (already / eat) lunch.', ['have already eaten', '’ve already eaten']),
      G('They ___ (not / call) me yet.', ['haven’t called', 'have not called']),
      O('Have you ever been to London?', 'Hiç Londra’ya gittin mi?'),
      O('I have just finished my work.', 'İşimi yeni bitirdim.'),
      O('She has lived here since 2015.', '2015’ten beri burada yaşıyor.'),
      O('We haven’t seen that film yet.', 'O filmi henüz görmedik.'),
      T('I have seen him last week.', false, 'I saw him last week.'),
      T('She has never been to Spain.', true),
      T('He have finished.', false, 'He has finished.'),
      T('We have lived here for 2010.', false, 'We have lived here since 2010.'),
      T('Have you done your homework yet?', true),
      T('I have went home.', false, 'I have gone home.')
    ],
    pairs: [P('for', 'süre (for 3 years)'), P('since', 'başlangıç (since 2020)'), P('just', 'daha yeni'), P('already', 'çoktan'), P('yet', 'henüz (soru/olumsuz)'), P('ever', 'hiç (soru)'), P('never', 'asla / hiç'), P('been to', 'gidip dönmüş')],
    homework: [
      { task: 'Hayatında yaptığın 3 deneyimi ve hiç yapmadığın 2 şeyi yaz (ever/never).', sample: 'I have been to Istanbul many times. I have eaten Japanese food. I have read all Harry Potter books. I have never flown in a helicopter. I have never seen a whale.' }
    ]
  },
  {
    id: 'phrasal-verbs',
    title: 'Phrasal Verbs',
    subtitle: 'Öbek fiiller: fiil + edat',
    level: 'A2–B2',
    emoji: '🧩',
    summary: 'Fiil + edat/zarf birleşimi; anlamı çoğu zaman tek tek kelimelerden tahmin edilemez: give up = vazgeçmek.',
    formula: ['fiil + up / down / on / off / out / in / back / away…', 'Ayrılabilen: turn the TV off / turn off the TV', 'Zamir ortada: turn it off (turn off it değil)'],
    sections: [
      {
        heading: 'En sık kullanılanlar',
        body: [
          '• **get up** kalkmak · **wake up** uyanmak · **go out** dışarı çıkmak · **come back** geri gelmek',
          '• **turn on / off** açmak / kapatmak · **put on** giymek · **take off** çıkarmak; (uçak) kalkmak',
          '• **look for** aramak · **look after** bakmak, ilgilenmek · **look forward to** dört gözle beklemek',
          '• **give up** vazgeçmek, bırakmak · **find out** öğrenmek, keşfetmek · **pick up** almak (yerden/birini)',
          '• **run out of** tükenmek · **get on with** iyi geçinmek · **put off** ertelemek · **set up** kurmak'
        ],
        examples: [X('Please turn off the lights.', 'Lütfen ışıkları kapat.'), X('I gave up smoking.', 'Sigarayı bıraktım.'), X('We ran out of milk.', 'Sütümüz bitti.')]
      },
      {
        heading: 'Ayrılabilen / ayrılamayan',
        body: ['• **Ayrılabilen:** nesne araya girebilir → put **your coat** on / put on **your coat**. Zamirse mutlaka araya: put **it** on.', '• **Ayrılamayan:** look **for** my keys, look **after** the baby, get **on** the bus.'],
        examples: [X('Can you pick me up at 6?', 'Beni 6’da alabilir misin?'), X('She is looking after her mother.', 'Annesine bakıyor.')]
      }
    ],
    tips: ['Phrasal verb’leri tek kelime gibi, örnek cümleyle öğren.', 'Kartlarına eklemek istediğin phrasal verb’leri “Kelime ekle” ekranından ekleyebilirsin.'],
    questions: [
      C('Please ___ the TV. I want to sleep.', ['turn on', 'turn off', 'turn up', 'turn in'], 1),
      C('I ___ at 7 every morning.', ['get up', 'get on', 'get off', 'get out'], 0),
      C('I’m ___ my glasses. Have you seen them?', ['looking after', 'looking for', 'looking forward', 'looking up'], 1),
      C('He ___ smoking last year.', ['gave up', 'gave in', 'gave out', 'gave back'], 0),
      C('Who ___ your children when you work?', ['looks for', 'looks after', 'looks at', 'looks out'], 1),
      C('The plane ___ at 10:30.', ['took off', 'took on', 'took up', 'took out'], 0),
      C('We have ___ sugar. Can you buy some?', ['run away', 'run out of', 'run into', 'run over'], 1),
      C('Your coat is on the floor. ___!', ['Pick up it', 'Pick it up', 'Pick up', 'Up pick it'], 1, 'Zamir araya girer.'),
      G('It’s cold. ___ on your jacket.', 'Put'),
      G('I’m looking ___ to the holiday.', 'forward'),
      G('Can you ___ me up from the station?', 'pick'),
      G('Don’t give ___! You can do it.', 'up'),
      G('I need to find ___ the truth.', 'out'),
      G('She gets ___ well with her neighbours.', 'on'),
      G('We put ___ the meeting until Monday.', 'off'),
      O('Please turn off your phones.', 'Lütfen telefonlarınızı kapatın.'),
      O('I am looking for a new job.', 'Yeni bir iş arıyorum.'),
      O('She takes off her shoes at home.', 'Evde ayakkabılarını çıkarır.'),
      O('We are looking forward to the weekend.', 'Hafta sonunu dört gözle bekliyoruz.'),
      T('Turn off it, please.', false, 'Turn it off, please.'),
      T('I wake up early on weekdays.', true),
      T('She is looking after her little brother.', true),
      T('We ran out of bread.', true),
      T('Look the baby after.', false, 'Look after the baby.', 'look after ayrılamaz.')
    ],
    pairs: [P('give up', 'vazgeçmek'), P('look for', 'aramak'), P('look after', 'bakmak, ilgilenmek'), P('turn off', 'kapatmak'), P('put on', 'giymek'), P('find out', 'öğrenmek'), P('run out of', 'tükenmek'), P('put off', 'ertelemek'), P('get on with', 'iyi geçinmek'), P('pick up', 'almak (birini)')],
    homework: [
      { task: 'Günlük hayatından 5 cümle yaz; her birinde farklı bir phrasal verb kullan.', sample: 'I get up at 7. I put on my coat and go out. I pick up my son from school. In the evening I look after my plants. I usually turn off my phone at 11.' }
    ]
  },
  {
    id: 'present-perfect-continuous',
    title: 'Present Perfect Continuous',
    subtitle: 'have / has been + fiil-ing',
    level: 'B1',
    emoji: '⏳',
    summary: 'Geçmişte başlayıp şimdiye kadar süren (veya yeni bitmiş, etkisi görülen) eylemler; sürece vurgu yapar.',
    formula: ['I/You/We/They + have been + fiil-ing', 'He/She/It + has been + fiil-ing', 'How long + have/has + özne + been + fiil-ing?'],
    sections: [
      {
        heading: 'Ne zaman kullanılır?',
        body: ['• **Şimdiye kadar süren eylem (süre vurgusu):** I’ve **been learning** English **for** two years.', '• **Yeni bitmiş, izi görülen eylem:** You’re wet! — Yes, I’ve **been running**.', '• **How long** sorusuyla: How long **have** you **been waiting**?'],
        examples: [X('She has been working here since May.', 'Mayıstan beri burada çalışıyor.'), X('It has been raining all day.', 'Bütün gün yağmur yağıyor.'), X('Your eyes are red. Have you been crying?', 'Gözlerin kırmızı. Ağlıyor muydun?')]
      },
      {
        heading: 'Present Perfect ile farkı',
        body: ['• **Perfect Continuous** → sürece vurgu: I’ve **been reading** this book (hâlâ okuyorum).', '• **Present Perfect** → sonuca/miktara vurgu: I’ve **read** three books (bitti, sayı belli).', '• Durum fiilleri (know, like, have=sahip olmak) continuous olmaz: I’ve **known** him for years.'],
        examples: [X('I have been painting the room.', 'Odayı boyuyorum / boyuyordum (süreç).'), X('I have painted the room.', 'Odayı boyadım (bitti).')]
      }
    ],
    tips: ['Türkçedeki “-dır …-yor” yapısı: “İki saattir bekliyorum” = I’ve been waiting for two hours.'],
    questions: [
      C('I ___ for two hours.', ['have been waiting', 'has been waiting', 'am waiting since', 'waited since'], 0),
      C('She ___ English since 2020.', ['have been learning', 'has been learning', 'is learning since', 'learned'], 1),
      C('How long ___ you been living here?', ['has', 'have', 'did', 'are'], 1),
      C('It ___ all morning.', ['has been raining', 'have been raining', 'is raining since', 'rains'], 0),
      C('You look tired. ___ you been working hard?', ['Has', 'Have', 'Did', 'Are'], 1),
      C('I ___ him for ten years. (know)', ['have been knowing', 'have known', 'am knowing', 'knew'], 1, 'know durum fiili.'),
      C('They have been playing tennis ___ an hour.', ['since', 'for', 'ago', 'yet'], 1),
      G('We ___ (wait) since 9 o’clock.', ['have been waiting', '’ve been waiting']),
      G('He ___ (work) here for five years.', ['has been working', '’s been working']),
      G('How long ___ she been studying?', 'has'),
      G('I’m tired because I ___ (run).', ['have been running', '’ve been running']),
      G('They have been talking ___ two hours.', 'for'),
      G('She has been living in Izmir ___ 2019.', 'since'),
      O('I have been learning English for two years.', 'İki yıldır İngilizce öğreniyorum.'),
      O('How long have you been waiting?', 'Ne kadar zamandır bekliyorsun?'),
      O('It has been snowing since morning.', 'Sabahtan beri kar yağıyor.'),
      T('I have been knowing her for years.', false, 'I have known her for years.'),
      T('She has been cooking all afternoon.', true),
      T('He have been working since 8.', false, 'He has been working since 8.'),
      T('We have been living here since five years.', false, 'We have been living here for five years.'),
      T('How long have you been studying?', true)
    ],
    pairs: [P('for two hours', 'iki saattir'), P('since Monday', 'pazartesiden beri'), P('How long…?', 'Ne kadar zamandır…?'), P('he/she/it', 'has been'), P('I/you/we/they', 'have been'), P('süreç vurgusu', 'Perfect Continuous'), P('sonuç vurgusu', 'Present Perfect')],
    homework: [
      { task: 'Şu anda devam eden 3 uzun süreli uğraşını “for/since” ile yaz ve bir “How long…?” sorusu ekle.', sample: 'I have been learning English for two years. I have been working at this company since 2021. I have been reading a great book this week. How long have you been playing the guitar?' }
    ]
  }
]
