import { C, G, O, P, T, X, type GrammarTopic } from './types'

export const TOPICS_2: GrammarTopic[] = [
  {
    id: 'future-simple',
    title: 'Gelecek Zaman (Future Simple)',
    subtitle: 'will / be going to',
    level: 'A2',
    emoji: '⏩',
    summary: '“will” anlık kararlar, tahminler ve sözler için; “be going to” önceden planlanmış niyetler ve belirtisi görülen tahminler için.',
    formula: ['Özne + will + yalın fiil', 'Özne + won’t + yalın fiil', 'Özne + am/is/are + going to + yalın fiil'],
    sections: [
      {
        heading: 'will',
        body: ['• **Anlık karar:** Telefon çalıyor — I’**ll** answer it!', '• **Tahmin / görüş:** I think it **will** rain.', '• **Söz ve teklif:** I **will** help you. I’**ll** carry that bag.', '• will tüm öznelerle aynıdır, fiil yalın kalır.'],
        examples: [X('I’ll call you later.', 'Seni sonra ararım.'), X('She will be 30 next year.', 'Seneye 30 yaşında olacak.'), X('I won’t tell anyone.', 'Kimseye söylemeyeceğim.')]
      },
      {
        heading: 'be going to',
        body: ['• **Önceden yapılmış plan / niyet:** I’m **going to** visit my parents this weekend.', '• **Kanıtı görülen tahmin:** Look at the clouds! It’s **going to** rain.'],
        examples: [X('We are going to buy a house.', 'Bir ev alacağız (planımız var).'), X('He is going to fall!', 'Düşecek! (görüyorum)')]
      },
      {
        heading: 'Soru ve zaman ifadeleri',
        body: ['• **Will** you come? · **Are** you **going to** study tonight?', '• tomorrow, next week, next year, soon, in two days, tonight'],
        examples: [X('Will you help me?', 'Bana yardım eder misin?'), X('What are you going to do tomorrow?', 'Yarın ne yapacaksın?')]
      }
    ],
    tips: ['Karar konuşurken mi verildi? → will. Daha önce mi verildi? → going to.', 'will’den sonra “to” gelmez: will go (will to go değil).'],
    questions: [
      C('I’m tired. I think I ___ go to bed early.', ['will', 'am going', 'going to', 'goes'], 0),
      C('Look at the sky! It ___ rain.', ['will', 'is going to', 'goes to', 'won’t'], 1, 'Kanıt görülüyor → going to.'),
      C('We ___ visit Rome next month. We bought the tickets.', ['will', 'are going to', 'go to', 'will to'], 1, 'Önceden plan.'),
      C('She will ___ you tomorrow.', ['calls', 'call', 'to call', 'calling'], 1),
      C('___ you help me with this box?', ['Are', 'Do', 'Will', 'Did'], 2),
      C('I promise I ___ be late again.', ['don’t', 'won’t', 'am not', 'not'], 1),
      C('They ___ going to move to Antalya.', ['is', 'are', 'am', 'will'], 1),
      C('The phone is ringing. — I ___ get it!', ['’ll', '’m going to', 'go', 'get'], 0, 'Anlık karar.'),
      G('I ___ (will / help) you with your homework.', ['will help', '’ll help']),
      G('He ___ (be going to) start a new job next week.', ['is going to start', '’s going to start']),
      G('It ___ (not / will) be cold tomorrow.', ['won’t be', 'will not be']),
      G('___ you come to my party? (will)', 'Will'),
      G('We ___ (be going to) have a baby!', ['are going to have', '’re going to have']),
      G('I think she ___ (will / pass) the exam.', ['will pass', '’ll pass']),
      O('I will call you tonight.', 'Bu gece seni arayacağım.'),
      O('We are going to travel next summer.', 'Gelecek yaz seyahat edeceğiz.'),
      O('She won’t be at the meeting.', 'O toplantıda olmayacak.'),
      O('What are you going to cook?', 'Ne pişireceksin?'),
      T('I will to go there.', false, 'I will go there.'),
      T('She is going to buy a car.', true),
      T('They will comes tomorrow.', false, 'They will come tomorrow.'),
      T('Look! The baby is going to cry.', true),
      T('He going to study tonight.', false, 'He is going to study tonight.'),
      T('I think it will be sunny.', true)
    ],
    pairs: [P('Anlık karar', 'will'), P('Önceden plan', 'be going to'), P('Söz verme', 'will'), P('Kanıtlı tahmin', 'be going to'), P('will not', 'won’t'), P('I will', 'I’ll')],
    homework: [
      { task: 'Gelecek hafta için 3 planını (going to) ve gelecekle ilgili 2 tahminini (will) yaz.', sample: 'I am going to visit my aunt. I am going to clean my room. I am going to start a course. I think it will be a busy week. I will probably be tired on Friday.' }
    ]
  },
  {
    id: 'present-continuous',
    title: 'Şimdiki Zaman (Present Continuous)',
    subtitle: 'Present Continuous',
    level: 'A1–A2',
    emoji: '▶️',
    summary: 'Şu anda devam eden eylemler, geçici durumlar ve yakın gelecek planları için. am/is/are + fiil-ing.',
    formula: ['I am + fiil-ing', 'He/She/It is + fiil-ing', 'You/We/They are + fiil-ing'],
    sections: [
      {
        heading: 'Ne zaman kullanılır?',
        body: ['• **Şu an olanlar:** I’m reading now.', '• **Geçici durumlar:** She’s living with her friend this month.', '• **Ayarlanmış yakın gelecek:** We’re meeting at 6 tomorrow.', '• Zaman ifadeleri: **now, right now, at the moment, today, this week, Look!, Listen!**'],
        examples: [X('I am cooking dinner now.', 'Şu an akşam yemeği pişiriyorum.'), X('They are watching a film.', 'Bir film izliyorlar.'), X('Listen! Someone is singing.', 'Dinle! Biri şarkı söylüyor.')]
      },
      {
        heading: '-ing yazımı',
        body: ['• Çoğu fiil: work → work**ing**', '• -e düşer: make → mak**ing**, write → writ**ing**', '• Kısa fiil + sessiz ikizlenir: run → ru**nn**ing, sit → si**tt**ing, swim → swi**mm**ing', '• -ie → -ying: lie → **lying**, die → **dying**'],
        examples: [X('She is writing a letter.', 'Bir mektup yazıyor.'), X('The children are swimming.', 'Çocuklar yüzüyor.')]
      },
      {
        heading: 'Durum fiilleri',
        body: ['• **know, like, love, hate, want, need, believe, understand, own** gibi fiiller genelde -ing almaz.', '❌ I am knowing him. ✅ I **know** him.'],
        examples: [X('I want a coffee.', 'Bir kahve istiyorum.'), X('Do you understand?', 'Anlıyor musun?')]
      }
    ],
    tips: ['Türkçedeki “-yor” ekinin karşılığı.', 'Geniş zaman = genel/alışkanlık, şimdiki zaman = şu an/geçici.'],
    questions: [
      C('Look! The baby ___.', ['sleeps', 'is sleeping', 'sleep', 'are sleeping'], 1),
      C('I ___ to music right now.', ['listen', 'am listening', 'is listening', 'listening'], 1),
      C('They ___ football at the moment.', ['are playing', 'is playing', 'plays', 'playing'], 0),
      C('She is ___ a cake.', ['makeing', 'making', 'make', 'makes'], 1),
      C('He is ___ in the sea.', ['swiming', 'swimming', 'swims', 'swim'], 1),
      C('I ___ the answer.', ['am knowing', 'know', 'knowing', 'is know'], 1, 'know durum fiili.'),
      C('___ you working today?', ['Do', 'Are', 'Is', 'Does'], 1),
      C('We ___ dinner with Ali tomorrow. (plan)', ['have', 'are having', 'has', 'had'], 1),
      G('She ___ (read) a book now.', ['is reading', '’s reading']),
      G('We ___ (not / watch) TV at the moment.', ['aren’t watching', 'are not watching']),
      G('Why ___ you crying?', 'are'),
      G('The dog ___ (run) in the garden.', ['is running', '’s running']),
      G('I ___ (sit) on the sofa.', ['am sitting', '’m sitting']),
      G('They ___ (wait) for the bus.', ['are waiting', '’re waiting']),
      G('He ___ (lie) on the beach.', ['is lying', '’s lying']),
      O('I am studying English now.', 'Şu an İngilizce çalışıyorum.'),
      O('She is talking on the phone.', 'Telefonda konuşuyor.'),
      O('Are you listening to me?', 'Beni dinliyor musun?'),
      O('They aren’t working this week.', 'Bu hafta çalışmıyorlar.'),
      T('She is cooking now.', true),
      T('I am liking this song.', false, 'I like this song.', 'like durum fiili.'),
      T('They is playing.', false, 'They are playing.'),
      T('He is runing.', false, 'He is running.'),
      T('We are meeting at 5 tomorrow.', true),
      T('Listen! The birds sing.', false, 'Listen! The birds are singing.')
    ],
    pairs: [P('work', 'working'), P('make', 'making'), P('run', 'running'), P('swim', 'swimming'), P('write', 'writing'), P('lie', 'lying'), P('sit', 'sitting'), P('play', 'playing')],
    homework: [
      { task: 'Etrafına bak: şu anda olan 5 şeyi yaz.', sample: 'I am sitting at my desk. My cat is sleeping on the sofa. My neighbour is talking on the phone. It is raining outside. I am drinking tea.' }
    ]
  },
  {
    id: 'conjunctions',
    title: 'Bağlaçlar',
    subtitle: 'Conjunctions & linking words',
    level: 'A2–B1',
    emoji: '🔗',
    summary: 'Cümleleri ve fikirleri bağlar: and, but, or, so, because, although, when, if, while…',
    formula: ['and · but · or · so (sıralama bağlaçları)', 'because · although · when · if · while · until (yan cümle bağlaçları)', 'however · therefore (cümle başında, virgülle)'],
    sections: [
      {
        heading: 'Temel bağlaçlar',
        body: ['• **and** (ve): ekleme', '• **but** (ama): zıtlık', '• **or** (veya): seçenek', '• **so** (bu yüzden): sonuç', '• **because** (çünkü): sebep'],
        examples: [X('I was tired, so I went to bed.', 'Yorgundum, bu yüzden yattım.'), X('I went to bed because I was tired.', 'Yattım çünkü yorgundum.'), X('Tea or coffee?', 'Çay mı kahve mi?')]
      },
      {
        heading: 'Zıtlık ve zaman',
        body: ['• **although / even though** (-e rağmen): Although it was cold, we went out.', '• **however** (ancak): cümle başında, virgülle → It was expensive. However, we bought it.', '• **when** (-dığında), **while** (-iken), **before / after** (önce/sonra), **until** (-e kadar), **as soon as** (-ir -mez)'],
        examples: [X('Although he is rich, he isn’t happy.', 'Zengin olmasına rağmen mutlu değil.'), X('Call me when you arrive.', 'Varınca beni ara.'), X('Wait here until I come back.', 'Ben dönene kadar burada bekle.')]
      },
      {
        heading: 'Koşul ve amaç',
        body: ['• **if** (eğer), **unless** (-medikçe): You will fail **unless** you study.', '• **so that** (-sın diye): I left early **so that** I could catch the bus.', '• **both … and**, **either … or**, **neither … nor**'],
        examples: [X('If it rains, we will stay home.', 'Yağmur yağarsa evde kalırız.'), X('She speaks both English and German.', 'Hem İngilizce hem Almanca konuşur.')]
      }
    ],
    tips: ['because → sebep, so → sonuç: aynı fikir iki yönden anlatılır.', '“although” ile “but” aynı cümlede kullanılmaz.'],
    questions: [
      C('I like tea ___ I don’t like coffee.', ['and', 'but', 'so', 'or'], 1),
      C('It was raining, ___ we stayed at home.', ['because', 'but', 'so', 'although'], 2),
      C('She was late ___ she missed the bus.', ['so', 'because', 'but', 'or'], 1),
      C('___ it was cold, he wasn’t wearing a coat.', ['Because', 'So', 'Although', 'And'], 2),
      C('Do you want pasta ___ rice?', ['and', 'or', 'but', 'so'], 1),
      C('Call me ___ you get home.', ['when', 'but', 'so', 'or'], 0),
      C('You won’t pass ___ you study.', ['if', 'unless', 'because', 'and'], 1),
      C('The hotel was nice. ___, it was too expensive.', ['However', 'Because', 'So', 'And'], 0),
      G('I was hungry, ___ I made a sandwich.', 'so'),
      G('He can’t come ___ he is ill.', 'because'),
      G('I read a book ___ I was waiting.', ['while', 'when']),
      G('___ she is young, she is very wise.', ['Although', 'Even though', 'Though']),
      G('Wait here ___ I come back.', 'until'),
      G('She speaks ___ English and French.', 'both'),
      G('Wash your hands ___ you eat.', 'before'),
      O('I stayed at home because I was ill.', 'Hastaydım çünkü evde kaldım.'),
      O('She is tired but she is happy.', 'Yorgun ama mutlu.'),
      O('If you hurry, you will catch the train.', 'Acele edersen treni yakalarsın.'),
      O('Although it was late, we kept working.', 'Geç olmasına rağmen çalışmaya devam ettik.'),
      T('Although it was hot, but we went out.', false, 'Although it was hot, we went out.'),
      T('I was tired, so I slept early.', true),
      T('She didn’t come because she was busy.', true),
      T('However the film was long, I liked it.', false, 'The film was long. However, I liked it.'),
      T('Call me when you are free.', true),
      T('You can have tea and coffee? Choose one.', false, 'You can have tea or coffee.')
    ],
    pairs: [P('and', 've'), P('but', 'ama'), P('or', 'veya'), P('so', 'bu yüzden'), P('because', 'çünkü'), P('although', '-e rağmen'), P('when', '-dığında'), P('until', '-e kadar'), P('unless', '-medikçe'), P('while', '-iken')],
    homework: [
      { task: 'Kendinle ilgili 5 cümle yaz; her birinde farklı bir bağlaç kullan (because, so, but, although, when).', sample: 'I study English because I want a better job. I was busy yesterday, so I didn’t call you. I like summer but I hate the heat. Although I am tired, I will go to the gym. When I finish work, I will cook.' }
    ]
  },
  {
    id: 'modals',
    title: 'Modal Fiiller',
    subtitle: 'can, could, will, would, should, must, may, might, have to',
    level: 'A2–B1',
    emoji: '🧭',
    summary: 'Yetenek, izin, rica, tavsiye, zorunluluk ve olasılık bildirir. Modaldan sonra fiil yalın gelir, -s almaz.',
    formula: ['Özne + modal + yalın fiil', 'Özne + modal + not + yalın fiil', 'Modal + özne + yalın fiil?'],
    sections: [
      {
        heading: 'Yetenek, izin, rica',
        body: ['• **can** (-ebilmek): I **can** swim. / **Can** I sit here?', '• **could**: geçmiş yetenek (I **could** run fast as a child) ve kibar rica (**Could** you help me?)', '• **will / would**: rica — **Will** you open the door? **Would** you like some tea? (kibar teklif)', '• **may**: resmi izin — **May** I come in?'],
        examples: [X('Could you repeat that, please?', 'Tekrar eder misiniz lütfen?'), X('Would you like a coffee?', 'Kahve ister misiniz?')]
      },
      {
        heading: 'Tavsiye ve zorunluluk',
        body: ['• **should** (-meli, tavsiye): You **should** see a doctor.', '• **must** (kesin zorunluluk / kural): You **must** wear a seatbelt.', '• **have to** (dış zorunluluk): I **have to** work on Saturday. (He **has to**)', '• **mustn’t** = yasak · **don’t have to** = gerek yok!'],
        examples: [X('You mustn’t smoke here.', 'Burada sigara içmemelisin (yasak).'), X('You don’t have to come.', 'Gelmek zorunda değilsin.')]
      },
      {
        heading: 'Olasılık',
        body: ['• **might / may** (belki): It **might** rain later.', '• **must** (kesin çıkarım): She **must** be tired. (Kesin yorgundur.)', '• **can’t** (imkânsız çıkarım): That **can’t** be true.', '• **would** (koşul/hayal): I **would** buy a house if I had money.'],
        examples: [X('He might come tonight.', 'Bu gece gelebilir.'), X('You must be hungry.', 'Kesin açsındır.')]
      }
    ],
    tips: ['Modaldan sonra “to” yok: can swim (can to swim değil). İstisna: have to, ought to.', 'He can (cans değil), she should (shoulds değil).'],
    questions: [
      C('I ___ speak three languages.', ['can', 'cans', 'can to', 'am can'], 0),
      C('You look ill. You ___ see a doctor.', ['should', 'can', 'would', 'might'], 0),
      C('___ you help me, please?', ['Must', 'Could', 'Should', 'Might'], 1),
      C('You ___ smoke in the hospital. It’s forbidden.', ['don’t have to', 'mustn’t', 'shouldn’t to', 'can'], 1),
      C('It’s Sunday. I ___ get up early.', ['mustn’t', 'don’t have to', 'can’t', 'shouldn’t'], 1, 'Gerek yok → don’t have to.'),
      C('She ___ be at home. The lights are on.', ['must', 'can’t', 'should', 'would'], 0),
      C('___ you like some cake?', ['Do', 'Would', 'Will', 'Can'], 1),
      C('He ___ work on Saturdays. (zorunlu)', ['have to', 'has to', 'must to', 'haves to'], 1),
      C('Take an umbrella. It ___ rain.', ['might', 'must', 'can’t', 'would'], 0),
      G('When I was five, I ___ swim. (geçmiş yetenek)', 'could'),
      G('You ___ wear a seatbelt. It’s the law.', 'must'),
      G('___ I open the window? (izin)', ['Can', 'May', 'Could']),
      G('That ___ be Ali. He is in London now. (imkânsız)', ['can’t', 'cannot']),
      G('You ___ eat more vegetables. (tavsiye)', 'should'),
      G('If I were rich, I ___ travel the world.', 'would'),
      G('She ___ to finish the report today. (dış zorunluluk)', 'has'),
      O('You should drink more water.', 'Daha fazla su içmelisin.'),
      O('Could you close the door?', 'Kapıyı kapatabilir misin?'),
      O('We have to leave now.', 'Şimdi gitmek zorundayız.'),
      O('It might snow tomorrow.', 'Yarın kar yağabilir.'),
      T('She cans drive.', false, 'She can drive.'),
      T('You should to rest.', false, 'You should rest.'),
      T('I must finish this today.', true),
      T('He has to wear a uniform.', true),
      T('You mustn’t come; it’s optional.', false, 'You don’t have to come; it’s optional.'),
      T('Would you like some water?', true)
    ],
    pairs: [P('can', 'yetenek / izin'), P('could', 'kibar rica'), P('should', 'tavsiye'), P('must', 'kesin zorunluluk'), P('mustn’t', 'yasak'), P('don’t have to', 'gerek yok'), P('might', 'olasılık (belki)'), P('would like', 'kibar istek')],
    homework: [
      { task: 'İngilizce öğrenen bir arkadaşına 5 tavsiye/kural yaz (should, must, don’t have to, can, might).', sample: 'You should read a little every day. You must practise speaking. You don’t have to know every word. You can watch films with subtitles. You might find podcasts helpful.' }
    ]
  }
]
