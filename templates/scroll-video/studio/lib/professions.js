/* What the studio knows before the client has told it anything.
   Picking a trade sets a scheme, a type pairing, the units on the readout and a
   four-beat story skeleton — a real starting point rather than lorem ipsum. */

export const PAIRINGS = {
  technical: {
    label: 'Michroma · Saira · IBM Plex Mono',
    href: 'https://fonts.googleapis.com/css2?family=Michroma&family=Saira:wght@100;200;300&family=IBM+Plex+Mono:wght@300;400&display=swap',
    display: "'Michroma',sans-serif", body: "'Saira',sans-serif", mono: "'IBM Plex Mono',monospace",
    weightHeading: 100, weightBody: 200
  },
  editorial: {
    label: 'Fraunces · Inter · JetBrains Mono',
    href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400&family=Inter:wght@200;300;400&family=JetBrains+Mono:wght@300;400&display=swap',
    display: "'Fraunces',serif", body: "'Inter',sans-serif", mono: "'JetBrains Mono',monospace",
    weightHeading: 200, weightBody: 300
  },
  couture: {
    label: 'Bodoni Moda · Jost · Space Mono',
    href: 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;500&family=Jost:wght@200;300;400&family=Space+Mono:wght@400&display=swap',
    display: "'Bodoni Moda',serif", body: "'Jost',sans-serif", mono: "'Space Mono',monospace",
    weightHeading: 200, weightBody: 300
  },
  industrial: {
    label: 'Chakra Petch · Barlow · Roboto Mono',
    href: 'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300;400&family=Barlow:wght@200;300;400&family=Roboto+Mono:wght@300;400&display=swap',
    display: "'Chakra Petch',sans-serif", body: "'Barlow',sans-serif", mono: "'Roboto Mono',monospace",
    weightHeading: 200, weightBody: 300
  },
  refined: {
    label: 'Cormorant Garamond · Karla · IBM Plex Mono',
    href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Karla:wght@200;300;400&family=IBM+Plex+Mono:wght@300;400&display=swap',
    display: "'Cormorant Garamond',serif", body: "'Karla',sans-serif", mono: "'IBM Plex Mono',monospace",
    weightHeading: 300, weightBody: 300
  },
  loud: {
    label: 'Anton · Archivo · Space Mono',
    href: 'https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@300;400;500&family=Space+Mono:wght@400&display=swap',
    display: "'Anton',sans-serif", body: "'Archivo',sans-serif", mono: "'Space Mono',monospace",
    weightHeading: 400, weightBody: 300
  },
  modern: {
    label: 'Syne · Manrope · DM Mono',
    href: 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700&family=Manrope:wght@200;300;500&family=DM+Mono:wght@300;400&display=swap',
    display: "'Syne',sans-serif", body: "'Manrope',sans-serif", mono: "'DM Mono',monospace",
    weightHeading: 200, weightBody: 300
  },
  classic: {
    label: 'Playfair Display · Inter · IBM Plex Mono',
    href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=Inter:wght@200;300;400&family=IBM+Plex+Mono:wght@300;400&display=swap',
    display: "'Playfair Display',serif", body: "'Inter',sans-serif", mono: "'IBM Plex Mono',monospace",
    weightHeading: 300, weightBody: 300
  }
}

/* `story` is a scaffold, not copy. Every string is meant to be replaced — but
   the shape teaches the client what the format wants: one claim per panel, a
   figure in each, and a closing offer. */
export const PROFESSIONS = {
  'deep-tech': {
    label: 'Deep tech · science · exploration',
    dark: true, accent: '#3ce6ff', ground: '#000000', fonts: 'technical',
    readout: { unit: 'M', from: 0, to: 3800, pad: 4 },
    cue: 'SCROLL TO DIVE', loader: 'Flooding ballast tanks', ready: 'Descent ready',
    zoneLabels: ['SURFACE', 'DESCENT', 'DEPTH', 'THE FLOOR'],
    story: {
      tagline: 'Deep-sea expeditions',
      mission: ['Expedition 07 · *EREBUS*', 'Pacific trench · Sector 9'],
      hero: ['How deep will you go?', 'One vessel. Eight passengers a year. A vertical voyage to **3,800 metres**.'],
      beats: [
        ['The first two hundred metres hold almost everything you picture.', 'And they are `less than 5%` of the ocean by volume.'],
        ['Past that, the sunlight fails.', 'The floodlights come on here. They stay on.'],
        ['No sunlight has ever touched this water.', '`~90%` of what lives down here makes its own light.']
      ],
      offer: [['*8* seats.', '$250,000.'], ['Departing *March 2027*.']],
      cta: 'Join the manifest'
    }
  },
  architecture: {
    label: 'Architecture · property · development',
    dark: false, accent: '#b4552b', ground: '#f3ede5', fonts: 'editorial',
    readout: { unit: 'M', from: 0, to: 412, pad: 3 },
    cue: 'SCROLL TO RISE', loader: 'Setting out', ready: 'Ready',
    zoneLabels: ['THE PODIUM', 'MID-RISE', 'SKY LOBBY', 'THE CROWN'],
    story: {
      tagline: 'Harbour district',
      mission: ['Tower 01 · *Completing 2028*', 'North quay · Plot 3'],
      hero: ['Four hundred and twelve metres of neighbourhood.', 'Forty-two floors, **eleven of them public**.'],
      beats: [
        ['The first six floors belong to the city.', 'No lobby, no barrier, no card reader — `1,900 m²` that stays open.'],
        ['Halfway up, the building opens again.', 'A second ground floor at `168 metres`, daylight on four sides.'],
        ['The top eight floors were the hardest thing we have drawn.', 'And the reason the rest of it works.']
      ],
      offer: [['*42* floors.', '11 public.'], ['Completing *2028*.']],
      cta: 'Register interest'
    }
  },
  fashion: {
    label: 'Fashion · beauty · retail',
    dark: true, accent: '#ff3b6b', ground: '#0b0708', fonts: 'couture',
    readout: { unit: '', from: 1, to: 24, pad: 2 },
    cue: 'SCROLL', loader: 'Dressing the set', ready: 'Ready',
    zoneLabels: ['OPENING', 'THE LINE', 'THE CLOSE', 'THE DROP'],
    story: {
      tagline: 'Autumn / Winter',
      mission: ['Collection 24 · *Atelier*', 'Shown in Paris'],
      hero: ['Twenty-four looks.', 'One fabric, worked **twenty-four ways**.'],
      beats: [
        ['It starts with a single bolt of undyed wool.', '`1,400 metres` of it, from one flock.'],
        ['Every seam in the collection is finished by hand.', '`Ninety hours` in the heaviest coat.'],
        ['Nothing here will be made twice.', 'When the bolt is gone, the collection is closed.']
      ],
      offer: [['*24* looks.', 'One bolt.'], ['Available *this Friday*.']],
      cta: 'Request the lookbook'
    }
  },
  automotive: {
    label: 'Automotive · engineering · motion',
    dark: true, accent: '#ff6a00', ground: '#08090b', fonts: 'industrial',
    readout: { unit: 'KM/H', from: 0, to: 340, pad: 3 },
    cue: 'SCROLL TO ACCELERATE', loader: 'Warming the car', ready: 'Ready',
    zoneLabels: ['STANDSTILL', 'LAUNCH', 'THE STRAIGHT', 'TOP END'],
    story: {
      tagline: 'Series production, 200 cars',
      mission: ['Programme 04 · *Chassis 001*', 'Homologated · EU / UK'],
      hero: ['Nought to three hundred and forty.', 'A car built around **one number**, and everything that number costs.'],
      beats: [
        ['The tub is a single piece.', '`38 kg`, and the reason the car turns the way it does.'],
        ['Downforce arrives before you need it.', '`680 kg` at two hundred, with nothing that moves.'],
        ['Two hundred cars. Then the tooling is destroyed.', 'This was never going to be a platform.']
      ],
      offer: [['*200* cars.', '£1.4m.'], ['First deliveries *2027*.']],
      cta: 'Arrange a viewing'
    }
  },
  hospitality: {
    label: 'Hospitality · travel · restaurants',
    dark: true, accent: '#c9a227', ground: '#0c1210', fonts: 'refined',
    readout: { unit: '', from: 0, to: 12, pad: 2 },
    cue: 'SCROLL THROUGH', loader: 'Laying the room', ready: 'Ready',
    zoneLabels: ['ARRIVAL', 'THE ROOM', 'THE TABLE', 'THE CLOSE'],
    story: {
      tagline: 'Twelve seats, one sitting',
      mission: ['Room 01 · *Chef\\u2019s table*', 'Open Thursday to Sunday'],
      hero: ['Twelve seats. One sitting. No menu.', 'You eat **what came in that morning**, in the order it should be eaten.'],
      beats: [
        ['The room was a boat shed until last spring.', 'We kept the floor, the doors and `nothing else`.'],
        ['Everything is within forty miles.', 'Except the salt, which is `from the bay outside`.'],
        ['Dinner runs about three hours.', 'There is one sitting a night, so it can.']
      ],
      offer: [['*12* seats.', 'One sitting.'], ['Booking opens *monthly*.']],
      cta: 'Join the list'
    }
  },
  fitness: {
    label: 'Fitness · sport · performance',
    dark: true, accent: '#c6ff2e', ground: '#0a0a0a', fonts: 'loud',
    readout: { unit: 'DAYS', from: 0, to: 90, pad: 2 },
    cue: 'SCROLL', loader: 'Loading the programme', ready: 'Ready',
    zoneLabels: ['DAY ONE', 'THE BLOCK', 'THE WALL', 'THE TEST'],
    story: {
      tagline: 'Ninety-day programme',
      mission: ['Block 03 · *Intake open*', 'Coached, in person'],
      hero: ['Ninety days. One measurable thing.', 'You pick the number. We build **everything else** around it.'],
      beats: [
        ['Week one is entirely assessment.', 'No programme survives contact with `an untested athlete`.'],
        ['Weeks four to eight are the ones people quit in.', 'Which is why the check-ins are `twice weekly` there.'],
        ['You retest on day ninety against day one.', 'Same protocol, same kit, `same time of day`.']
      ],
      offer: [['*90* days.', '12 places.'], ['Next intake *in March*.']],
      cta: 'Apply for a place'
    }
  },
  finance: {
    label: 'Finance · legal · professional services',
    dark: true, accent: '#d4b872', ground: '#0a0f18', fonts: 'classic',
    readout: { unit: 'YRS', from: 0, to: 40, pad: 2 },
    cue: 'SCROLL', loader: 'Opening the file', ready: 'Ready',
    zoneLabels: ['TODAY', 'THE FIRST DECADE', 'COMPOUNDING', 'THE HORIZON'],
    story: {
      tagline: 'Private clients since 1986',
      mission: ['Practice · *Founded 1986*', 'Regulated · FCA 114239'],
      hero: ['Forty years is the only horizon that matters.', 'Everything we do is built to be **held**, not traded.'],
      beats: [
        ['We take on twenty families a year.', 'It is the number `one partner` can actually know.'],
        ['Nothing is sold to you here.', 'We hold `no product`, and are paid by you alone.'],
        ['The plan is rewritten every year.', 'A forty-year plan written once is `a forecast`, not a plan.']
      ],
      offer: [['*20* families a year.'], ['Reviewing new clients *quarterly*.']],
      cta: 'Request an introduction'
    }
  },
  studio: {
    label: 'Creative studio · agency · music',
    dark: true, accent: '#8b5cf6', ground: '#07060c', fonts: 'modern',
    readout: { unit: '', from: 0, to: 100, pad: 3 },
    cue: 'SCROLL', loader: 'Loading', ready: 'Ready',
    zoneLabels: ['BRIEF', 'THE WORK', 'THE RELEASE', 'AFTER'],
    story: {
      tagline: 'Design and moving image',
      mission: ['Studio · *Est. 2019*', 'London · remote'],
      hero: ['We make about six things a year.', 'Which is why you can see **all of them**.'],
      beats: [
        ['A project starts with one week of nothing but questions.', 'It is the `cheapest week` of the whole thing.'],
        ['Then one idea, taken further than is comfortable.', 'Not `three options` to choose between.'],
        ['We stay on after launch.', 'The first `ninety days` are where the work actually lands.']
      ],
      offer: [['*6* projects a year.'], ['Two slots open for *Q3*.']],
      cta: 'Start a conversation'
    }
  }
}

export const PROFESSION_IDS = Object.keys(PROFESSIONS)
