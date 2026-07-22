// T19 connected-text reading generator (§12). Emits one decodable-sentence reading pack per
// phonics envelope above digraphs (blends → two-syllable). Each item: a decodable sentence
// (passage + audioText) + a literal comprehension MCQ. decodableWithin reuses the existing
// PH-* envelope (cumulative graphemes), so no new decodability entries are needed. The question
// stem is comprehension scaffolding (read-aloud supported), not decodability-linted.
// Row: [passage, question, correctLabel, distractor1, distractor2, difficulty]
// Run: node scripts/gen-reading.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'packs')

const LEVELS = {
  'reading-L03-blends': {
    skill: 'RD-blend-sentences', env: 'PH-blends',
    lesson: {
      iCanStatement: 'I can read sentences with blends and say what they mean.',
      explanation: 'These sentences have blend words — two consonants you say quickly together, like st in stop, fr in frog, and nd in sand. Read each sound in order, blend them, then think about what the sentence means.',
      workedExamples: [ { text: 'The frog can swim.', note: 'fr blends together — frog.' }, { text: 'The truck got stuck.', note: 'tr and ck — truck; st — stuck.' } ]
    },
    rows: [
      ['The frog can swim and spin.', 'What can the frog do?', 'swim and spin', 'hop and stop', 'run and grab', 1],
      ['Stan had a big red truck.', 'What colour is the truck?', 'red', 'tan', 'black', 1],
      ['The twin got a snack.', 'What did the twin get?', 'a snack', 'a drum', 'a flag', 1],
      ['A crab sat on a rock.', 'Where did the crab sit?', 'on a rock', 'in the pond', 'on the sled', 1],
      ['Fred can clap and grin.', 'What can Fred do?', 'clap and grin', 'stop and spin', 'trip and drop', 2],
      ['Brad put the brick on the truck.', 'What did Brad put on the truck?', 'the brick', 'the flag', 'the drum', 2],
      ['The black cat sat on the step.', 'Where did the cat sit?', 'on the step', 'in the chest', 'on the sled', 2],
      ['Glen had a plum for lunch.', 'What did Glen have for lunch?', 'a plum', 'a snack', 'a chip', 2],
      ['The clock is on the shelf.', 'Where is the clock?', 'on the shelf', 'on the sled', 'in the chest', 2],
      ['Spot the dog ran fast.', 'Who ran fast?', 'Spot the dog', 'the black cat', 'the twin', 1],
      ['The kids swim in the pond.', 'Where do the kids swim?', 'in the pond', 'in the mud', 'on the ship', 2],
      ['Fran got a flag and a drum.', 'What did Fran get?', 'a flag and a drum', 'a brick and a truck', 'a plum and a snack', 3],
      ['The frog sat on a log in the sun.', 'Where did the frog sit?', 'on a log', 'on the step', 'in the chest', 2],
      ['The truck got stuck in the mud.', 'Where did the truck get stuck?', 'in the mud', 'on the step', 'at the shop', 3],
      ['Trish had a fresh snack.', 'What did Trish have?', 'a fresh snack', 'a red flag', 'a big drum', 2],
      ['Glen ran to catch the bus.', 'Why did Glen run?', 'to catch the bus', 'to grab a snack', 'to swim', 3],
      ['The drum is on the desk.', 'Where is the drum?', 'on the desk', 'on the step', 'in the chest', 2],
      ['Brad and Fran swim fast.', 'Who can swim fast?', 'Brad and Fran', 'the black cat', 'the frog', 3]
    ]
  },
  'reading-L04-silent-e': {
    skill: 'RD-silente-sentences', env: 'PH-silent-e',
    lesson: {
      iCanStatement: 'I can read sentences with magic-e words and say what they mean.',
      explanation: 'Magic-e words have a silent e at the end that makes the vowel say its name: cake, bike, home, cube. Read the word with the long vowel sound, then think about what the whole sentence means.',
      workedExamples: [ { text: 'Jake rode his bike home.', note: 'bike, home — the e makes the vowel long.' }, { text: 'Kate had a big cake.', note: 'cake — a says its name.' } ]
    },
    rows: [
      ['Jake rode his bike home.', 'Where did Jake ride his bike?', 'home', 'to the lake', 'to the cave', 1],
      ['Kate had a big cake.', 'What did Kate have?', 'a big cake', 'a red bike', 'a cute mule', 1],
      ['The mole hid in the hole.', 'Where did the mole hide?', 'in the hole', 'on the gate', 'in the cave', 2],
      ['Pete ate five grapes.', 'How many grapes did Pete eat?', 'five', 'nine', 'ten', 2],
      ['Dave came home late.', 'When did Dave come home?', 'late', 'at nine', 'in time', 2],
      ['The cute mule ran to the gate.', 'Where did the mule run?', 'to the gate', 'to the cave', 'to the lake', 2],
      ['Mike gave Jane a rose.', 'What did Mike give Jane?', 'a rose', 'a bike', 'a cake', 2],
      ['The bike is by the gate.', 'Where is the bike?', 'by the gate', 'in the cave', 'on the lake', 1],
      ['Jane had nine limes.', 'How many limes did Jane have?', 'nine', 'five', 'ten', 2],
      ['The snake hid in the cave.', 'Where did the snake hide?', 'in the cave', 'in the hole', 'by the gate', 3],
      ['Steve rode home in time.', 'Did Steve get home in time?', 'yes, in time', 'no, he was late', 'he did not ride', 3],
      ['The plane came home late.', 'When did the plane come home?', 'late', 'at five', 'on time', 2],
      ['Kate and Jake bake a cake.', 'What did Kate and Jake bake?', 'a cake', 'a lime pie', 'a rose', 2],
      ['The cube is on the plate.', 'Where is the cube?', 'on the plate', 'in the cave', 'by the gate', 2],
      ['Dave gave the mule some hay.', 'Who did Dave give the hay to?', 'the mule', 'the snake', 'the mole', 3],
      ['Mike will race his bike.', 'What will Mike race?', 'his bike', 'a plane', 'a mule', 3],
      ['The rose is by the lake.', 'Where is the rose?', 'by the lake', 'in the cave', 'on the gate', 1]
    ]
  },
  'reading-L05-vowel-teams': {
    skill: 'RD-vowelteam-sentences', env: 'PH-vowel-teams',
    lesson: {
      iCanStatement: 'I can read sentences with vowel-team words and say what they mean.',
      explanation: 'Vowel teams are two vowels that make one sound: ai (rain), ee (feet), oa (boat), ea (leaf). Read the team as one sound, blend the word, then think about what the sentence means.',
      workedExamples: [ { text: 'The boat is on the sea.', note: 'oa in boat, ea in sea.' }, { text: 'Jean had a green bean.', note: 'ea in Jean and bean, ee in green.' } ]
    },
    rows: [
      ['The boat is on the sea.', 'Where is the boat?', 'on the sea', 'in the rain', 'on the road', 1],
      ['Jean had a green bean.', 'What did Jean have?', 'a green bean', 'a red boat', 'a wet coat', 1],
      ['The rain fell on the road.', 'Where did the rain fall?', 'on the road', 'on the boat', 'in the seat', 2],
      ['Dean can see the moon.', 'What can Dean see?', 'the moon', 'the rain', 'the boat', 2],
      ['The goat ate the leaf.', 'What did the goat eat?', 'the leaf', 'the bean', 'the seed', 2],
      ['Joan put on her coat.', 'What did Joan put on?', 'her coat', 'her boat', 'her seat', 2],
      ['The bee sat on the leaf.', 'Where did the bee sit?', 'on the leaf', 'on the road', 'in the rain', 1],
      ['Sea foam is on the beach.', 'Where is the sea foam?', 'on the beach', 'on the road', 'in the boat', 3],
      ['The team ran in the rain.', 'When did the team run?', 'in the rain', 'in the sun', 'on the road', 2],
      ['Neil keeps his seeds in a jar.', 'Where does Neil keep his seeds?', 'in a jar', 'in a boat', 'on the road', 3],
      ['The train is on the track.', 'Where is the train?', 'on the track', 'on the sea', 'in the rain', 2],
      ['Jean sailed the boat to sea.', 'Where did Jean sail the boat?', 'to sea', 'to the road', 'to the beach', 3],
      ['The moon is high in the sky.', 'Where is the moon?', 'high in the sky', 'on the sea', 'on the road', 2],
      ['Dean ate meat and beans.', 'What did Dean eat?', 'meat and beans', 'a green leaf', 'sea foam', 2],
      ['The goat and the sheep eat hay.', 'What do the goat and sheep eat?', 'hay', 'beans', 'seeds', 2],
      ['Rain and sleet fell all day.', 'What fell all day?', 'rain and sleet', 'sea foam', 'green leaves', 3]
    ]
  },
  'reading-L06-r-controlled': {
    skill: 'RD-rcontrolled-sentences', env: 'PH-r-controlled',
    lesson: {
      iCanStatement: 'I can read sentences with bossy-r words and say what they mean.',
      explanation: 'When r follows a vowel it changes its sound: ar (car), or (fork), er/ir/ur (her, bird, turn). Read the vowel and r as one chunk, then think about what the sentence means.',
      workedExamples: [ { text: 'The car is far.', note: 'ar in car and far.' }, { text: 'The bird is on the perch.', note: 'ir in bird, er in perch.' } ]
    },
    rows: [
      ['The car is far away.', 'How far is the car?', 'far away', 'near the door', 'in the barn', 1],
      ['The bird sat on the perch.', 'Where did the bird sit?', 'on the perch', 'in the barn', 'by the door', 2],
      ['Bart put corn in the cart.', 'What did Bart put in the cart?', 'corn', 'a fork', 'a card', 2],
      ['Her shirt is dark green.', 'What colour is her shirt?', 'dark green', 'red', 'purple', 2],
      ['The horse is in the barn.', 'Where is the horse?', 'in the barn', 'in the car', 'by the fork', 1],
      ['Kurt got a burn on his arm.', 'Where did Kurt get a burn?', 'on his arm', 'on his card', 'on his fork', 3],
      ['The girl has a red card.', 'What does the girl have?', 'a red card', 'a green fork', 'a dark shirt', 2],
      ['A shark swam near the surf.', 'Where did the shark swim?', 'near the surf', 'in the barn', 'by the car', 3],
      ['The farmer feeds the horse.', 'What does the farmer feed?', 'the horse', 'the shark', 'the bird', 2],
      ['Turn the car at the corner.', 'Where do you turn the car?', 'at the corner', 'in the barn', 'by the surf', 3],
      ['The fork is on the cart.', 'Where is the fork?', 'on the cart', 'in the barn', 'by the door', 1],
      ['Her purse is in the car.', 'Where is her purse?', 'in the car', 'in the barn', 'on the perch', 2],
      ['The bird chirps in the morning.', 'When does the bird chirp?', 'in the morning', 'in the dark', 'at the corner', 3],
      ['Mark has a short black cord.', 'What does Mark have?', 'a short black cord', 'a red card', 'a green fork', 2],
      ['The horse ran far past the barn.', 'Where did the horse run?', 'far past the barn', 'to the corner', 'near the surf', 3],
      ['The nurse gave Bart a jar.', 'What did the nurse give Bart?', 'a jar', 'a card', 'a fork', 2]
    ]
  },
  'reading-L07-diphthongs': {
    skill: 'RD-diphthong-sentences', env: 'PH-diphthongs',
    lesson: {
      iCanStatement: 'I can read sentences with oi, oy, ou, ow, aw words and say what they mean.',
      explanation: 'Some vowel teams glide from one sound to another: oi/oy (coin, boy), ou/ow (out, cow), aw/au (paw, haul). Read the team as one gliding sound, then think about what the sentence means.',
      workedExamples: [ { text: 'The boy found a coin.', note: 'oy in boy, ou in found, oi in coin.' }, { text: 'The cow is out now.', note: 'ow in cow and now, ou in out.' } ]
    },
    rows: [
      ['The boy found a coin.', 'What did the boy find?', 'a coin', 'a toy', 'an owl', 1],
      ['The cow is out now.', 'Where is the cow?', 'out now', 'in the town', 'by the pond', 2],
      ['Roy has a new toy.', 'What does Roy have?', 'a new toy', 'a gold coin', 'a brown owl', 1],
      ['The owl sat on the bough.', 'Where did the owl sit?', 'on the bough', 'in the town', 'by the coin', 2],
      ['The dog has a sore paw.', 'What is sore?', 'the paw', 'the jaw', 'the claw', 2],
      ['We saw a brown cow.', 'What did we see?', 'a brown cow', 'a small owl', 'a round coin', 2],
      ['The boy sat down in the town.', 'Where did the boy sit down?', 'in the town', 'on the bough', 'by the pond', 2],
      ['Joy found a round coin.', 'What did Joy find?', 'a round coin', 'a brown toy', 'a loud owl', 2],
      ['The cat has sharp claws.', 'What does the cat have?', 'sharp claws', 'a sore paw', 'a new toy', 2],
      ['The crowd was very loud.', 'How was the crowd?', 'very loud', 'very small', 'very round', 3],
      ['Troy spoils his toy.', 'What does Troy spoil?', 'his toy', 'his coin', 'his crown', 3],
      ['The owl flew down to the ground.', 'Where did the owl fly?', 'down to the ground', 'up to the cloud', 'out of town', 3],
      ['Paul saw a hawk.', 'What did Paul see?', 'a hawk', 'an owl', 'a cow', 2],
      ['The king has a gold crown.', 'What does the king have?', 'a gold crown', 'a round coin', 'a new toy', 2],
      ['The boy shouts out loud.', 'How does the boy shout?', 'out loud', 'very soft', 'not at all', 3],
      ['A brown owl hoots at night.', 'When does the owl hoot?', 'at night', 'at noon', 'in the town', 3]
    ]
  },
  'reading-L08-two-syllable': {
    skill: 'RD-twosyllable-sentences', env: 'PH-two-syllable',
    lesson: {
      iCanStatement: 'I can read sentences with two-syllable words and say what they mean.',
      explanation: 'Longer words split into two chunks (syllables): sun-set, nap-kin, rab-bit. Read each chunk, blend them into the word, then think about what the whole sentence means.',
      workedExamples: [ { text: 'The rabbit sat at sunset.', note: 'rab-bit, sun-set — read each chunk.' }, { text: 'The kitten hid in a basket.', note: 'kit-ten, bas-ket.' } ]
    },
    rows: [
      ['The rabbit sat in the sunset.', 'When did the rabbit sit?', 'in the sunset', 'at the picnic', 'in the basket', 1],
      ['The kitten hid in a basket.', 'Where did the kitten hide?', 'in a basket', 'in the wagon', 'on the napkin', 2],
      ['We had a picnic on the hilltop.', 'Where was the picnic?', 'on the hilltop', 'in the basket', 'by the sunset', 2],
      ['The muffin is on the napkin.', 'Where is the muffin?', 'on the napkin', 'in the basket', 'on the wagon', 2],
      ['A rabbit and a kitten ran.', 'Who ran?', 'a rabbit and a kitten', 'a robin and a puppet', 'a goblin and a bandit', 2],
      ['The robin sat on the mailbox.', 'Where did the robin sit?', 'on the mailbox', 'in the basket', 'on the hilltop', 2],
      ['The magnet is in the pocket.', 'Where is the magnet?', 'in the pocket', 'in the basket', 'on the napkin', 2],
      ['We put the picnic in the wagon.', 'Where did we put the picnic?', 'in the wagon', 'on the hilltop', 'in the pocket', 2],
      ['The puppet sat on the shelf.', 'Where did the puppet sit?', 'on the shelf', 'in the basket', 'on the wagon', 2],
      ['The rabbit had a carrot at sunset.', 'What did the rabbit have?', 'a carrot', 'a muffin', 'a napkin', 3],
      ['The kitten and the puppy nap.', 'What do the kitten and puppy do?', 'nap', 'run', 'swim', 2],
      ['A robin sat on the chimney.', 'Where did the robin sit?', 'on the chimney', 'in the basket', 'on the hilltop', 3],
      ['We had a picnic and a sunset.', 'What did we have?', 'a picnic and a sunset', 'a muffin and a magnet', 'a wagon and a basket', 3],
      ['The bandit hid in the tunnel.', 'Where did the bandit hide?', 'in the tunnel', 'on the hilltop', 'in the wagon', 3],
      ['The muffin and the carrot are on the napkin.', 'What is on the napkin?', 'the muffin and the carrot', 'the magnet and the pocket', 'the puppet and the basket', 3],
      ['The kitten sat in the sunset on the hilltop.', 'Where did the kitten sit?', 'on the hilltop', 'in the tunnel', 'in the basket', 3]
    ]
  }
}

const esc = () => {}
const num = i => String(i + 1).padStart(3, '0')
const abbr = { 'RD-blend-sentences': 'bl', 'RD-silente-sentences': 'se', 'RD-vowelteam-sentences': 'vt', 'RD-rcontrolled-sentences': 'rc', 'RD-diphthong-sentences': 'di', 'RD-twosyllable-sentences': '2s' }

for (const [packId, cfg] of Object.entries(LEVELS)) {
  const items = cfg.rows.map(([passage, q, correct, d1, d2, diff], i) => {
    const pos = i % 3, others = [d1, d2]
    const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === pos ? correct : others[p < pos ? p : p - 1] }))
    return { id: `rd-${abbr[cfg.skill]}-${num(i)}`, skillId: cfg.skill, itemType: 'passage_question', difficulty: diff,
      passage, audioText: passage, stem: q, choices, correctChoiceId: 'abc'[pos],
      missedConceptOnFail: 'comprehension-literal', rationale: `${correct}.`, decodableWithin: cfg.env }
  })
  const pack = { packId, strand: 'reading', skillIds: [cfg.skill], version: 1, items, lessons: { [cfg.skill]: cfg.lesson } }
  writeFileSync(join(dir, packId + '.json'), JSON.stringify(pack, null, 2) + '\n')
  console.log(`Wrote ${items.length} items → ${packId}`)
}
esc()
