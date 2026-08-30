export interface SeedReelm {
  id: string
  name: string
  code: string
  category: 'gaming' | 'music' | 'community' | 'tech' | 'art'
  description: string
  showInDiscover: boolean
  isPublic: boolean
  joinMode: 'open' | 'request'
  membersCount: number
  tags: string[]
  isDefault?: boolean
}

export const SEED_REELMS: SeedReelm[] = [
  // 10 Official Reelms
  {
    id: 'reelms-gaming',
    name: 'Reelms Gaming',
    code: 'RGAME',
    category: 'gaming',
    description: 'The official Reelms gaming hub. Find teammates, share clips, discuss releases, and organize tournaments across all platforms.',
    showInDiscover: true,
    isPublic: true,
    joinMode: 'open',
    membersCount: 1420,
    tags: ['gaming', 'esports', 'pc', 'console', 'tournaments', 'co-op']
  },
  {
    id: 'reelms-music',
    name: 'Reelms Music',
    code: 'RMUSIC',
    category: 'music',
    description: 'Official music realm for artists, producers, audio enthusiasts, and listeners. Share tracks, feedback, and discover new sounds.',
    showInDiscover: true,
    isPublic: true,
    joinMode: 'open',
    membersCount: 980,
    tags: ['music', 'production', 'beats', 'live', 'instruments', 'audio']
  },
  {
    id: 'reelms-professionals',
    name: 'Reelms Professionals',
    code: 'RPRO',
    category: 'community',
    description: 'Connect with entrepreneurs, executives, founders, and industry leaders. Career advice, networking, and business discussions.',
    showInDiscover: true,
    isPublic: true,
    joinMode: 'open',
    membersCount: 760,
    tags: ['professional', 'business', 'career', 'founders', 'networking']
  },
  {
    id: 'reelms-devs',
    name: 'Reelms Developers',
    code: 'RDEV',
    category: 'tech',
    description: 'Official developers realm. Web, mobile, systems, open source, AI engineering, code reviews, and architecture discussions.',
    showInDiscover: true,
    isPublic: true,
    joinMode: 'open',
    membersCount: 1150,
    tags: ['tech', 'programming', 'coding', 'webdev', 'opensource', 'ai']
  },
  {
    id: 'reelms-creators',
    name: 'Reelms Creators',
    code: 'RCREATE',
    category: 'art',
    description: 'The official home for digital artists, designers, illustrators, video editors, and 3D creators. Showcase and collaborate.',
    showInDiscover: true,
    isPublic: true,
    joinMode: 'open',
    membersCount: 890,
    tags: ['art', 'design', 'creative', 'illustration', '3d', 'video']
  },
  {
    id: 'reelms-cinema',
    name: 'Reelms Cinema & TV',
    code: 'RCINEMA',
    category: 'community',
    description: 'Official hub for cinephiles, filmmakers, and TV buffs. Movie nights, reviews, film analysis, and industry discussions.',
    showInDiscover: true,
    isPublic: true,
    joinMode: 'open',
    membersCount: 640,
    tags: ['cinema', 'movies', 'tv', 'film', 'reviews', 'streaming']
  },
  {
    id: 'reelms-books',
    name: 'Reelms Books & Literature',
    code: 'RBOOK',
    category: 'community',
    description: "Official book club and writer's sanctuary. Monthly reads, literary discussions, creative writing workshops, and poetry.",
    showInDiscover: true,
    isPublic: true,
    joinMode: 'open',
    membersCount: 520,
    tags: ['books', 'literature', 'writing', 'reading', 'poetry', 'author']
  },
  {
    id: 'reelms-fitness',
    name: 'Reelms Fitness & Wellness',
    code: 'RFIT',
    category: 'community',
    description: 'Official fitness, wellness, and healthy living community. Workouts, nutrition, mindfulness, and habit tracking.',
    showInDiscover: true,
    isPublic: true,
    joinMode: 'open',
    membersCount: 830,
    tags: ['fitness', 'wellness', 'gym', 'health', 'nutrition', 'workout']
  },
  {
    id: 'reelms-science',
    name: 'Reelms Science & Space',
    code: 'RSCI',
    category: 'tech',
    description: 'Official hub for space exploration, astronomy, quantum physics, biology, and scientific breakthroughs.',
    showInDiscover: true,
    isPublic: true,
    joinMode: 'open',
    membersCount: 710,
    tags: ['science', 'space', 'astronomy', 'physics', 'research', 'cosmos']
  },
  {
    id: 'reelms-community-hub',
    name: 'Reelms Global Community',
    code: 'RGLOBAL',
    category: 'community',
    description: 'The worldwide crossroads of Reelms. Meet members from every continent, practice languages, and share stories.',
    showInDiscover: true,
    isPublic: true,
    joinMode: 'open',
    membersCount: 2350,
    tags: ['global', 'community', 'international', 'languages', 'culture']
  },

  // 22 Community & User Reelms
  {
    id: 'indie-gamedev',
    name: 'Indie Game Devs',
    code: 'IGDEV',
    category: 'gaming',
    description: 'Independent game developers sharing devlogs, shader tricks, Godot & Unity workflows, and playtests.',
    showInDiscover: true,
    isPublic: true,
    joinMode: 'open',
    membersCount: 610,
    tags: ['gamedev', 'indie', 'unity', 'godot', 'pixelart']
  },
  {
    id: 'lofi-chill-zone',
    name: 'Lo-Fi Chill Zone',
    code: 'LOFI',
    category: 'music',
    description: 'Relaxed study sessions, ambient beats, 24/7 listening rooms, and cozy conversation.',
    showInDiscover: true,
    isPublic: true,
    joinMode: 'open',
    membersCount: 870,
    tags: ['lofi', 'chill', 'study', 'relax', 'ambient']
  },
  {
    id: 'ai-prompt-craft',
    name: 'AI & Prompt Craft',
    code: 'AICRAFT',
    category: 'tech',
    description: 'Exploring LLMs, multimodal models, automation workflows, open-source models, and agent architectures.',
    showInDiscover: true,
    isPublic: true,
    joinMode: 'open',
    membersCount: 940,
    tags: ['ai', 'prompt', 'llm', 'ml', 'agents', 'automation']
  },
  {
    id: 'cyberpunk-synthwave',
    name: 'Cyberpunk & Synthwave',
    code: 'CYBER',
    category: 'art',
    description: 'Neon aesthetics, retro-futurism, synthwave music, and dystopian sci-fi worldbuilding.',
    showInDiscover: true,
    isPublic: true,
    joinMode: 'open',
    membersCount: 430,
    tags: ['cyberpunk', 'synthwave', 'retro', 'neon', 'scifi']
  },
  {
    id: 'ui-ux-craft',
    name: 'UI/UX Craft & Systems',
    code: 'UIUX',
    category: 'tech',
    description: 'Product design, Figma systems, micro-interactions, accessibility, and user research critiques.',
    showInDiscover: false,
    isPublic: true,
    joinMode: 'open',
    membersCount: 580,
    tags: ['ui', 'ux', 'figma', 'designsystems', 'product']
  },
  {
    id: 'electronic-music-lab',
    name: 'Electronic Music Lab',
    code: 'EMUSIC',
    category: 'music',
    description: 'Synth patches, modular setups, Ableton & FL Studio workflows, sound design, and live jams.',
    showInDiscover: false,
    isPublic: true,
    joinMode: 'open',
    membersCount: 490,
    tags: ['edm', 'synths', 'modular', 'ableton', 'flstudio']
  },
  {
    id: 'tr-tech-startups',
    name: 'Turkish Tech & Startups',
    code: 'TRTECH',
    category: 'community',
    description: 'Türkiye ve global teknoloji ekosistemi, startup deneyimleri, yazılım ve kariyer sohbetleri.',
    showInDiscover: false,
    isPublic: true,
    joinMode: 'open',
    membersCount: 720,
    tags: ['startup', 'turkiye', 'yazilim', 'teknoloji', 'girisimcilik']
  },
  {
    id: 'blender-3d-art',
    name: 'Blender & 3D Artistry',
    code: 'B3D',
    category: 'art',
    description: '3D modeling, sculpting, procedural materials, geometry nodes, and render showcases.',
    showInDiscover: false,
    isPublic: true,
    joinMode: 'open',
    membersCount: 510,
    tags: ['blender', '3d', 'render', 'sculpting', 'vfx']
  },
  {
    id: 'mech-keyboards',
    name: 'Mechanical Keyboards Club',
    code: 'MKB',
    category: 'tech',
    description: 'Custom builds, switches, lubing guides, keycaps, sound tests, and group buys.',
    showInDiscover: false,
    isPublic: true,
    joinMode: 'open',
    membersCount: 390,
    tags: ['keyboards', 'switches', 'keycaps', 'mechanical', 'hardware']
  },
  {
    id: 'anime-manga-lounge',
    name: 'Anime & Manga Lounge',
    code: 'ANIME',
    category: 'art',
    description: 'Seasonal anime discussions, manga recommendations, cosplay, and Japanese pop culture.',
    showInDiscover: false,
    isPublic: true,
    joinMode: 'open',
    membersCount: 850,
    tags: ['anime', 'manga', 'japan', 'cosplay', 'otaku']
  },
  {
    id: 'coffee-deep-work',
    name: 'Coffee & Deep Work',
    code: 'COFFEE',
    category: 'community',
    description: 'Daily pomodoro co-working sessions, coffee brewing methods, and productivity systems.',
    showInDiscover: false,
    isPublic: true,
    joinMode: 'open',
    membersCount: 340,
    tags: ['coffee', 'deepwork', 'productivity', 'pomodoro', 'focus']
  },
  {
    id: 'boardgames-tabletop',
    name: 'Board Game Tabletop',
    code: 'BGAME',
    category: 'gaming',
    description: 'Strategy board games, D&D campaigns, tabletop RPGs, and miniature painting.',
    showInDiscover: false,
    isPublic: true,
    joinMode: 'open',
    membersCount: 290,
    tags: ['tabletop', 'dnd', 'boardgames', 'rpg', 'miniatures']
  },
  {
    id: 'street-film-photo',
    name: 'Street & Film Photography',
    code: 'PHOTO',
    category: 'art',
    description: 'Analog film cameras, 35mm & medium format, street photography, and darkroom techniques.',
    showInDiscover: false,
    isPublic: true,
    joinMode: 'open',
    membersCount: 460,
    tags: ['photography', '35mm', 'film', 'analog', 'street']
  },
  {
    id: 'web3-protocols',
    name: 'Web3 & Decentralized Protocols',
    code: 'WEB3',
    category: 'tech',
    description: 'Smart contract development, cryptographic protocols, decentralized compute, and security.',
    showInDiscover: false,
    isPublic: true,
    joinMode: 'open',
    membersCount: 380,
    tags: ['web3', 'crypto', 'blockchain', 'smartcontracts', 'p2p']
  },
  {
    id: 'filmmakers-editors',
    name: 'Filmmakers & Editors Room',
    code: 'FILM',
    category: 'community',
    description: 'Cinematography, color grading in DaVinci, sound design, lighting setups, and short films.',
    showInDiscover: false,
    isPublic: true,
    joinMode: 'open',
    membersCount: 310,
    tags: ['filmmaking', 'davinci', 'editing', 'cinema', 'camera']
  },
  {
    id: 'bookworms-writers',
    name: 'Bookworms & Fiction Writers',
    code: 'WRITERS',
    category: 'community',
    description: 'Creative writing prompts, worldbuilding, character design, and honest manuscript feedback.',
    showInDiscover: false,
    isPublic: true,
    joinMode: 'open',
    membersCount: 275,
    tags: ['fiction', 'writing', 'authors', 'novels', 'manuscript']
  },
  {
    id: 'calisthenics-movement',
    name: 'Calisthenics & Movement',
    code: 'CALIS',
    category: 'community',
    description: 'Bodyweight training, handstands, mobility work, rings routines, and progression tracking.',
    showInDiscover: false,
    isPublic: true,
    joinMode: 'open',
    membersCount: 420,
    tags: ['calisthenics', 'bodyweight', 'workout', 'fitness', 'mobility']
  },
  {
    id: 'sound-design-workshop',
    name: 'Sound Designers Workshop',
    code: 'SDESIGN',
    category: 'music',
    description: 'Foley recording, synthesis, game audio implementation with FMOD/Wwise, and field recording.',
    showInDiscover: false,
    isPublic: true,
    joinMode: 'open',
    membersCount: 230,
    tags: ['sounddesign', 'foley', 'fmod', 'wwise', 'gameaudio']
  },
  {
    id: 'minimalist-architecture',
    name: 'Minimalist Architecture & Spaces',
    code: 'ARCH',
    category: 'art',
    description: 'Interior design, brutalism, modern architecture, lighting studies, and thoughtful spaces.',
    showInDiscover: false,
    isPublic: true,
    joinMode: 'open',
    membersCount: 360,
    tags: ['architecture', 'minimalism', 'interior', 'design', 'brutalism']
  },
  {
    id: 'retro-computing',
    name: 'Retro Computing & 90s Web',
    code: 'RETRO',
    category: 'tech',
    description: 'Vintage hardware, CRT monitors, retro OS customization, demoscene, and nostalgic software.',
    showInDiscover: false,
    isPublic: true,
    joinMode: 'open',
    membersCount: 280,
    tags: ['retro', 'vintage', '90s', 'crt', 'demoscene', 'dos']
  },
  {
    id: 'astronomy-night-sky',
    name: 'Astronomy & Night Sky',
    code: 'ASTRO',
    category: 'tech',
    description: 'Astrophotography, stargazing equipment, deep-sky objects, eclipses, and planetary science.',
    showInDiscover: false,
    isPublic: true,
    joinMode: 'open',
    membersCount: 340,
    tags: ['astronomy', 'astrophotography', 'telescopes', 'stars', 'planets']
  },
  {
    id: 'speedrunning-hub',
    name: 'Speedrunning Hub',
    code: 'SPEEDRUN',
    category: 'gaming',
    description: 'Game mechanics analysis, routing, world record attempts, and leaderboard discussions.',
    showInDiscover: false,
    isPublic: true,
    joinMode: 'open',
    membersCount: 410,
    tags: ['speedrun', 'gaming', 'wr', 'routing', 'glitches']
  }
]
