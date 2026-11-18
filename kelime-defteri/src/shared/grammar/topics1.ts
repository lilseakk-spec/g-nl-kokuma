import { C, G, O, P, T, X, type GrammarTopic } from './types'

export const TOPICS_1: GrammarTopic[] = [
  {
    id: 'present-simple-positive',
    title: 'Geniş Zaman — Olumlu Cümleler',
    subtitle: 'Present Simple (positive)',
    level: 'A1',
    emoji: '🔁',
    summary: 'Alışkanlıklar, rutinler ve genel doğrular için kullanılır. He/She/It ile fiile -s eklenir.',
    formula: ['I / You / We / They + fiil', 'He / She / It + fiil + -s / -es', 'be: I am · he/she/it is · you/we/they are'],
    sections: [
      {
        heading: 'Ne zaman kullanılır?',
        body: [
          '• **Alışkanlık ve rutinler:** Her gün, her hafta tekrarlanan işler.',
          '• **Genel doğrular:** Bilimsel gerçekler, değişmeyen durumlar.',
          '• **Programlar:** Tren, ders, film saatleri gibi sabit planlar.'
        ],
        examples: [X('I drink coffee every morning.', 'Her sabah kahve içerim.'), X('Water boils at 100 degrees.', 'Su 100 derecede kaynar.'), X('The train leaves at 8.', 'Tren 8’de kalkar.')]
      },
      {
        heading: 'He / She / It ile -s takısı',
        body: [
          '• Çoğu fiile **-s** eklenir: work → works, play → plays.',
          '• **-s, -sh, -ch, -x, -o** ile bitenlere **-es**: watch → watches, go → goes, do → does.',
          '• Sessiz harf + **y** → **-ies**: study → studies, fly → flies. (Sesli + y: play → plays)',
          '• Düzensiz: **have → has**.'
        ],
        examples: [X('She works in a hospital.', 'O bir hastanede çalışır.'), X('He watches TV at night.', 'O geceleri televizyon izler.'), X('My father has a car.', 'Babamın bir arabası var.')]
      },
      {
        heading: 'Sıklık zarfları',
        body: [
          '**always** (her zaman) · **usually** (genellikle) · **often** (sık sık) · **sometimes** (bazen) · **rarely** (nadiren) · **never** (asla)',
          '• Normal fiilden **önce** gelir: I **always** get up early.',
          '• **be** fiilinden **sonra** gelir: She is **always** happy.'
        ],
        examples: [X('We usually eat at home.', 'Genellikle evde yeriz.'), X('He is never late.', 'O asla geç kalmaz.')]
      }
    ],
    tips: ['Türkçedeki “-r / -ar / -er” geniş zaman eki gibi düşün: “çalışırım” = I work.', 'En sık hata: “He go” yerine “He goes”.'],
    questions: [
      C('She ___ to work by bus.', ['go', 'goes', 'going', 'gos'], 1, 'He/She/It ile go → goes.'),
      C('They ___ football on Sundays.', ['plays', 'play', 'playing', 'is play'], 1, 'They ile fiil yalın kalır.'),
      C('My brother ___ a new phone.', ['have', 'haves', 'has', 'having'], 2, 'have → has (he/she/it).'),
      C('The sun ___ in the east.', ['rise', 'rises', 'rising', 'rised'], 1, 'Genel doğru, it → rises.'),
      C('I ___ tea every day.', ['drinks', 'drink', 'drinking', 'am drink'], 1),
      C('He ___ English at university.', ['studys', 'studies', 'study', 'studing'], 1, 'Sessiz harf + y → ies.'),
      C('We are ___ tired after work.', ['always', 'alwayss', 'every', 'ever'], 0, 'Sıklık zarfı be fiilinden sonra.'),
      C('Which sentence is correct?', ['She usually get up at 7.', 'She get usually up at 7.', 'She usually gets up at 7.', 'She gets up usually at 7.'], 2),
      G('My mother ___ (cook) dinner every evening.', 'cooks'),
      G('Tom ___ (watch) the news at 9.', 'watches', 'sh/ch → es'),
      G('Cats ___ (like) fish.', 'like'),
      G('She ___ (fly) to London every month.', 'flies'),
      G('He ___ (do) his homework after school.', 'does'),
      G('I ___ (be) a student.', 'am'),
      G('My friends ___ (be) very kind.', 'are'),
      G('The shop ___ (open) at 9 a.m.', 'opens'),
      O('She always drinks milk in the morning.', 'O sabahları her zaman süt içer.'),
      O('We play tennis on Saturdays.', 'Cumartesileri tenis oynarız.'),
      O('My father works in a bank.', 'Babam bir bankada çalışır.'),
      O('He never eats fast food.', 'O asla fast food yemez.'),
      O('The children go to school by bus.', 'Çocuklar okula otobüsle gider.'),
      T('He play the guitar.', false, 'He plays the guitar.', 'He/She/It ile -s gerekir.'),
      T('They live in Ankara.', true),
      T('She watchs TV every night.', false, 'She watches TV every night.'),
      T('I usually walk to work.', true),
      T('My sister have two cats.', false, 'My sister has two cats.'),
      T('Water boils at 100 degrees.', true),
      T('He goes always to the gym.', false, 'He always goes to the gym.', 'Sıklık zarfı normal fiilden önce.')
    ],
    pairs: [P('work', 'works'), P('watch', 'watches'), P('study', 'studies'), P('go', 'goes'), P('have', 'has'), P('play', 'plays'), P('do', 'does'), P('fly', 'flies')],
    homework: [
      { task: 'Günlük rutinini anlatan 5 cümle yaz (sabah, iş/okul, akşam). Sıklık zarfları kullan.', sample: 'I usually get up at 7. I always have breakfast. I go to work by metro. I sometimes cook dinner. I never sleep late.' },
      { task: 'Bir aile üyeni (he/she) anlatan 4 cümle yaz. -s takısına dikkat et.', sample: 'My mother works in a school. She teaches English. She loves books. She often visits her friends.' }
    ]
  },
  {
    id: 'questions',
    title: 'İngilizcede Soru Sormak',
    subtitle: 'Questions: do/does, be, Wh-',
    level: 'A1–A2',
    emoji: '❓',
    summary: 'Evet/hayır soruları yardımcı fiille başlar; Wh- soruları soru kelimesiyle. Yardımcı fiil özneden önce gelir.',
    formula: ['Do / Does + özne + fiil?', 'Am / Is / Are + özne + …?', 'Wh- + yardımcı fiil + özne + fiil?'],
    sections: [
      {
        heading: 'Evet / Hayır soruları',
        body: [
          '• Geniş zamanda **Do** (I/you/we/they) ve **Does** (he/she/it) kullanılır. Does varsa fiil **-s almaz**.',
          '• **be** fiilinde yer değiştirme yeterli: You are tired → **Are you** tired?',
          '• Diğer zamanlarda kendi yardımcısı: **Did** you go? **Will** she come? **Can** you swim? **Have** you seen?',
          '• Kısa cevaplar: Yes, I do. / No, she doesn’t. / Yes, they are.'
        ],
        examples: [X('Do you like coffee?', 'Kahve sever misin?'), X('Does he live here?', 'O burada mı yaşıyor?'), X('Is she your sister?', 'O senin kız kardeşin mi?')]
      },
      {
        heading: 'Wh- soru kelimeleri',
        body: [
          '**What** ne · **Where** nerede · **When** ne zaman · **Who** kim · **Why** neden · **How** nasıl · **Which** hangisi · **Whose** kimin',
          '**How much** ne kadar (sayılamayan/fiyat) · **How many** kaç tane · **How often** ne sıklıkla · **How old** kaç yaşında',
          '• Sıra: **Wh- + do/does/did/be + özne + fiil?** → Where **do you** work?'
        ],
        examples: [X('Where do you work?', 'Nerede çalışıyorsun?'), X('What time does the film start?', 'Film saat kaçta başlıyor?'), X('Why are you sad?', 'Neden üzgünsün?')]
      },
      {
        heading: 'Özne sorusu (Who / What)',
        body: ['• Who/What öznenin kendisini soruyorsa **do/does kullanılmaz**: **Who lives** here? (Kim burada yaşıyor?)', '• Nesneyi soruyorsa kullanılır: **Who do you** love? (Kimi seviyorsun?)'],
        examples: [X('Who called you?', 'Seni kim aradı?'), X('What happened?', 'Ne oldu?')]
      }
    ],
    tips: ['Türkçedeki “-mi” eki İngilizcede yardımcı fiili başa almakla yapılır.', 'Does / Did kullandıysan fiil yalın kalır: Does she work? Did you see?'],
    questions: [
      C('___ you like pizza?', ['Does', 'Do', 'Are', 'Is'], 1),
      C('___ she speak French?', ['Do', 'Is', 'Does', 'Are'], 2),
      C('___ they at home now?', ['Do', 'Are', 'Does', 'Is'], 1, 'be fiili: are + they.'),
      C('Where ___ he work?', ['do', 'does', 'is', 'are'], 1),
      C('Does your brother ___ a car?', ['has', 'have', 'having', 'haves'], 1, 'Does varsa fiil yalın.'),
      C('___ is your birthday? — In May.', ['Where', 'When', 'Who', 'Why'], 1),
      C('___ apples do you want? — Three.', ['How much', 'How many', 'How old', 'How often'], 1),
      C('Who ___ in this house?', ['does live', 'lives', 'do live', 'living'], 1, 'Özne sorusu: do/does yok.'),
      C('___ did you go yesterday? — To the cinema.', ['What', 'Where', 'Who', 'How'], 1),
      G('___ you happy? — Yes, I am.', 'Are'),
      G('___ she work on Saturdays? — No, she doesn’t.', 'Does'),
      G('What ___ you do at weekends?', 'do'),
      G('___ old is your son? — He is ten.', 'How'),
      G('___ is that bag? — It’s Ali’s.', 'Whose'),
      G('___ often do you go to the gym? — Twice a week.', 'How'),
      G('___ you see the match last night?', 'Did'),
      G('___ much is this shirt?', 'How'),
      O('Where do you live?', 'Nerede yaşıyorsun?'),
      O('Does she like chocolate?', 'O çikolata sever mi?'),
      O('What time do you get up?', 'Saat kaçta kalkarsın?'),
      O('Why are you late today?', 'Bugün neden geç kaldın?'),
      O('How many brothers do you have?', 'Kaç erkek kardeşin var?'),
      T('Does he works here?', false, 'Does he work here?', 'Does varsa fiil yalın.'),
      T('Where do they live?', true),
      T('You are a teacher?', false, 'Are you a teacher?'),
      T('Who wants tea?', true, undefined, 'Özne sorusu, do/does yok.'),
      T('What you do on Sundays?', false, 'What do you do on Sundays?'),
      T('Is she your friend?', true)
    ],
    pairs: [P('What', 'Ne'), P('Where', 'Nerede'), P('When', 'Ne zaman'), P('Who', 'Kim'), P('Why', 'Neden'), P('How', 'Nasıl'), P('Which', 'Hangisi'), P('Whose', 'Kimin')],
    homework: [
      { task: 'Yeni tanıştığın birine sorabileceğin 5 soru yaz (en az 3 farklı Wh- kelimesi).', sample: 'What is your name? Where do you live? What do you do? Do you like music? How often do you travel?' },
      { task: 'Bir otelde resepsiyona soracağın 4 soru yaz.', sample: 'Do you have a free room? How much is it per night? What time is breakfast? Is there Wi-Fi?' }
    ]
  },
  {
    id: 'negatives',
    title: 'Olumsuz Cümleler',
    subtitle: 'Negative sentences',
    level: 'A1–A2',
    emoji: '🚫',
    summary: 'Olumsuzluk “not” ile yapılır: don’t / doesn’t / isn’t / didn’t / won’t / can’t.',
    formula: ['I/You/We/They + don’t + fiil', 'He/She/It + doesn’t + fiil', 'am not / isn’t / aren’t · didn’t + fiil · won’t + fiil'],
    sections: [
      {
        heading: 'Geniş zamanda olumsuz',
        body: ['• **don’t** = do not, **doesn’t** = does not.', '• doesn’t kullanınca fiil **-s almaz**: She doesn’t **like** (likes değil).'],
        examples: [X('I don’t eat meat.', 'Et yemem.'), X('He doesn’t drive.', 'O araba kullanmaz.')]
      },
      {
        heading: 'be fiili ve diğer zamanlar',
        body: [
          '• be: I’m **not**, she **isn’t**, they **aren’t**, I **wasn’t**, they **weren’t**.',
          '• Geçmiş: **didn’t + yalın fiil** → I didn’t go.',
          '• Gelecek: **won’t + fiil** → She won’t come.',
          '• Modal: **can’t, shouldn’t, mustn’t** + fiil.',
          '• Şimdiki zaman: I’m **not** working, he **isn’t** sleeping.'
        ],
        examples: [X('She isn’t at home.', 'O evde değil.'), X('We didn’t see the film.', 'Filmi görmedik.'), X('I can’t swim.', 'Yüzemem.')]
      },
      {
        heading: 'Tek olumsuzluk kuralı',
        body: ['• İngilizcede bir cümlede **tek olumsuz** olur. ❌ I don’t know nothing. ✅ I don’t know **anything**. / I know **nothing**.', '• **never** zaten olumsuzdur: He **never** calls. (don’t eklenmez)'],
        examples: [X('I don’t have any money.', 'Hiç param yok.'), X('There isn’t anybody here.', 'Burada kimse yok.')]
      }
    ],
    tips: ['Önce cümlenin zamanını bul, sonra o zamanın yardımcı fiiline “not” ekle.'],
    questions: [
      C('She ___ coffee.', ['don’t like', 'doesn’t like', 'doesn’t likes', 'not like'], 1),
      C('They ___ at school today.', ['don’t', 'isn’t', 'aren’t', 'doesn’t'], 2),
      C('I ___ to the party last night.', ['don’t go', 'didn’t go', 'didn’t went', 'not went'], 1),
      C('He ___ come tomorrow.', ['won’t', 'don’t', 'isn’t', 'didn’t'], 0),
      C('I ___ hungry.', ['am not', 'don’t', 'isn’t', 'not'], 0),
      C('We ___ any milk.', ['haven’t got', 'don’t got', 'hasn’t', 'not have'], 0),
      C('Which is correct?', ['I don’t know nothing.', 'I don’t know anything.', 'I not know anything.', 'I doesn’t know anything.'], 1),
      C('My phone ___ working.', ['isn’t', 'doesn’t', 'don’t', 'aren’t'], 0),
      G('He ___ (not / play) tennis.', ['doesn’t play', 'does not play']),
      G('We ___ (not / be) ready yet.', ['aren’t', 'are not']),
      G('I ___ (not / watch) TV yesterday.', ['didn’t watch', 'did not watch']),
      G('She ___ (not / can) drive.', ['can’t', 'cannot', 'can not']),
      G('They ___ (not / live) here.', ['don’t live', 'do not live']),
      G('It ___ (not / rain) now.', ['isn’t raining', 'is not raining']),
      G('I ___ (not / will) be late.', ['won’t', 'will not']),
      O('She doesn’t eat sugar.', 'O şeker yemez.'),
      O('We didn’t go to work yesterday.', 'Dün işe gitmedik.'),
      O('I am not a doctor.', 'Ben doktor değilim.'),
      O('They won’t be here tomorrow.', 'Yarın burada olmayacaklar.'),
      T('He don’t like fish.', false, 'He doesn’t like fish.'),
      T('She doesn’t speaks English.', false, 'She doesn’t speak English.'),
      T('We aren’t tired.', true),
      T('I didn’t saw him.', false, 'I didn’t see him.', 'didn’t + yalın fiil.'),
      T('He never drinks tea.', true),
      T('I can’t find my keys.', true)
    ],
    pairs: [P('do not', 'don’t'), P('does not', 'doesn’t'), P('is not', 'isn’t'), P('are not', 'aren’t'), P('did not', 'didn’t'), P('will not', 'won’t'), P('cannot', 'can’t'), P('was not', 'wasn’t')],
    homework: [
      { task: 'Sevmediğin veya yapmadığın 5 şeyi yaz (don’t/doesn’t, didn’t, can’t kullan).', sample: 'I don’t like horror films. I don’t drink coffee at night. I didn’t sleep well yesterday. I can’t play the piano. My brother doesn’t eat vegetables.' }
    ]
  },
  {
    id: 'past-simple',
    title: 'Geçmiş Zaman (Past Simple)',
    subtitle: 'Past Simple',
    level: 'A1–A2',
    emoji: '⏪',
    summary: 'Geçmişte başlayıp bitmiş olaylar. Düzenli fiillere -ed eklenir; düzensizlerin 2. hali kullanılır.',
    formula: ['Özne + fiil-ed / V2', 'Özne + didn’t + yalın fiil', 'Did + özne + yalın fiil?', 'was (I/he/she/it) · were (you/we/they)'],
    sections: [
      {
        heading: 'Ne zaman kullanılır?',
        body: ['• Geçmişte belli bir zamanda olmuş ve **bitmiş** olaylar.', '• Zaman ifadeleri: **yesterday, last week, two days ago, in 2020, when I was a child**.'],
        examples: [X('I visited my grandmother yesterday.', 'Dün büyükannemi ziyaret ettim.'), X('We moved to Izmir in 2019.', '2019’da İzmir’e taşındık.')]
      },
      {
        heading: 'Düzenli fiiller (-ed)',
        body: ['• work → worked, play → played', '• -e ile bitenler: live → lived', '• sessiz + y: study → studied', '• kısa fiil + sessiz harf ikizlenir: stop → stopped, plan → planned'],
        examples: [X('She cleaned the house.', 'O evi temizledi.'), X('They stopped the car.', 'Arabayı durdurdular.')]
      },
      {
        heading: 'Olumsuz ve soru',
        body: ['• Olumsuz: **didn’t + yalın fiil** → I didn’t **go** (went değil).', '• Soru: **Did** you **see** it?', '• be: I **was** / they **were** · wasn’t / weren’t · Was she…?'],
        examples: [X('He didn’t call me.', 'Beni aramadı.'), X('Did you like the film?', 'Filmi beğendin mi?'), X('We were at home.', 'Evdeydik.')]
      }
    ],
    tips: ['Türkçedeki “-di” geçmiş zaman ekinin karşılığıdır.', 'did kullandığın an fiil 1. hale döner.'],
    questions: [
      C('I ___ to Paris last summer.', ['go', 'went', 'goed', 'gone'], 1),
      C('She ___ her homework yesterday.', ['finish', 'finished', 'finishs', 'finishing'], 1),
      C('We ___ at the cinema last night.', ['was', 'were', 'are', 'did'], 1),
      C('Did you ___ him?', ['saw', 'see', 'seen', 'sees'], 1),
      C('He ___ breakfast this morning.', ['didn’t have', 'didn’t had', 'don’t have', 'not had'], 0),
      C('They ___ to London two years ago.', ['move', 'moved', 'moving', 'moves'], 1),
      C('The bus ___ suddenly.', ['stoped', 'stopped', 'stopping', 'stops'], 1, 'stop → stopped (ikizleme).'),
      C('___ she at work yesterday?', ['Did', 'Was', 'Were', 'Does'], 1),
      G('I ___ (study) English last night.', 'studied'),
      G('She ___ (buy) a new dress.', 'bought'),
      G('We ___ (not / see) the match.', ['didn’t see', 'did not see']),
      G('___ you enjoy the party?', 'Did'),
      G('He ___ (be) very tired yesterday.', 'was'),
      G('They ___ (live) in Bursa in 2015.', 'lived'),
      G('My mother ___ (make) a cake.', 'made'),
      G('I ___ (plan) a trip last month.', 'planned'),
      O('We watched a film last night.', 'Dün gece bir film izledik.'),
      O('She didn’t come to school yesterday.', 'Dün okula gelmedi.'),
      O('Did you call your mother?', 'Anneni aradın mı?'),
      O('They were very happy at the wedding.', 'Düğünde çok mutluydular.'),
      T('I goed to the market.', false, 'I went to the market.'),
      T('She visited her aunt last week.', true),
      T('Did he went home?', false, 'Did he go home?'),
      T('We was late.', false, 'We were late.'),
      T('They didn’t answer the phone.', true),
      T('He studyed hard.', false, 'He studied hard.')
    ],
    pairs: [P('play', 'played'), P('stop', 'stopped'), P('study', 'studied'), P('live', 'lived'), P('go', 'went'), P('see', 'saw'), P('buy', 'bought'), P('be (I)', 'was')],
    homework: [
      { task: 'Geçen hafta sonu ne yaptığını anlatan 5 cümle yaz (en az 2 olumsuz cümle).', sample: 'Last Saturday I visited my friends. We had lunch in a small restaurant. We didn’t go to the cinema. In the evening I watched a film at home. I didn’t sleep late.' }
    ]
  },
  {
    id: 'irregular-verbs',
    title: 'Düzensiz Fiiller',
    subtitle: 'Irregular verbs (V1 – V2 – V3)',
    level: 'A2',
    emoji: '🔀',
    summary: 'Geçmiş (V2) ve 3. halleri (V3) -ed almayan fiiller. En sık kullanılanları ezberlemek gerekir.',
    formula: ['V1 (yalın) – V2 (geçmiş) – V3 (past participle)', 'V2 → Past Simple: I went', 'V3 → Present Perfect / Passive: I have gone · It was made'],
    sections: [
      {
        heading: 'Gruplar halinde öğren',
        body: [
          '• **Üçü aynı:** cut–cut–cut, put–put–put, let–let–let, hit–hit–hit, cost–cost–cost',
          '• **V2 = V3:** buy–bought–bought, bring–brought, think–thought, teach–taught, make–made, have–had, find–found, keep–kept, sleep–slept, leave–left, send–sent, sell–sold, tell–told',
          '• **Üçü farklı:** go–went–gone, see–saw–seen, eat–ate–eaten, take–took–taken, write–wrote–written, speak–spoke–spoken, drive–drove–driven, give–gave–given, know–knew–known',
          '• **V1 = V3:** come–came–come, become–became–become, run–ran–run'
        ]
      },
      {
        heading: 'Kullanım',
        body: ['• V2 olumlu geçmiş cümlede: She **wrote** a letter.', '• did/didn’t ile V1’e dön: Did she **write**? She didn’t **write**.', '• V3 have/has ile: She has **written** a letter.'],
        examples: [X('I bought a new bag.', 'Yeni bir çanta aldım.'), X('Have you ever eaten sushi?', 'Hiç suşi yedin mi?'), X('He didn’t take the bus.', 'Otobüse binmedi.')]
      }
    ],
    tips: ['Her gün 5 fiil: sesli oku, üç halini yaz, bir cümle kur.', 'read–read–read: yazılışı aynı, okunuşu /riːd/–/red/–/red/.'],
    questions: [
      C('go – went – ___', ['goed', 'gone', 'went', 'going'], 1),
      C('I ___ a great film yesterday.', ['see', 'saw', 'seen', 'seed'], 1),
      C('She has ___ three books.', ['wrote', 'write', 'written', 'writed'], 2),
      C('buy – ___ – bought', ['buyed', 'bought', 'boughten', 'buy'], 1),
      C('He ___ his keys at home.', ['leaved', 'left', 'leave', 'lefted'], 1),
      C('They have ___ to Spain.', ['went', 'go', 'gone', 'goed'], 2),
      C('Which group has the same three forms?', ['go', 'cut', 'see', 'eat'], 1),
      C('We ___ a lot of photos on holiday.', ['taked', 'took', 'taken', 'take'], 1),
      G('eat – ate – ___', 'eaten'),
      G('I ___ (find) my wallet under the bed.', 'found'),
      G('She ___ (teach) us French last year.', 'taught'),
      G('Have you ___ (speak) to him?', 'spoken'),
      G('He ___ (drive) to work yesterday.', 'drove'),
      G('think – ___ – thought', 'thought'),
      G('I have ___ (know) her for years.', 'known'),
      G('The shoes ___ (cost) 50 dollars.', 'cost'),
      O('I bought some bread this morning.', 'Bu sabah biraz ekmek aldım.'),
      O('She has written a long email.', 'Uzun bir e-posta yazdı.'),
      O('We ate dinner at a nice restaurant.', 'Güzel bir restoranda akşam yemeği yedik.'),
      O('He told me the truth.', 'Bana gerçeği söyledi.'),
      T('I buyed a car.', false, 'I bought a car.'),
      T('She has gone home.', true),
      T('We seen that film.', false, 'We saw that film. / We have seen that film.'),
      T('He brought some flowers.', true),
      T('They have ate lunch.', false, 'They have eaten lunch.'),
      T('I put the book on the table yesterday.', true, undefined, 'put–put–put')
    ],
    pairs: [P('go', 'went'), P('see', 'saw'), P('buy', 'bought'), P('take', 'took'), P('write', 'wrote'), P('eat', 'ate'), P('think', 'thought'), P('give', 'gave'), P('speak', 'spoke'), P('make', 'made')],
    homework: [
      { task: 'Şu fiillerin geçmiş halleriyle (V2) birer cümle yaz: go, see, buy, eat, write.', sample: 'I went to the park. I saw an old friend. I bought a coffee. We ate sandwiches. I wrote a message to my mother.' },
      { task: 'have + V3 ile “hiç … yaptın mı?” tarzında 3 soru yaz.', sample: 'Have you ever seen the sea? Have you ever eaten Thai food? Have you ever driven a truck?' }
    ]
  }
]
