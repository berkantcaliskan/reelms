const { exec } = require('child_process')

// Comprehensive database of popular game executables and creative/media apps
const GAME_DATABASE = {
  // Competitive & Esports
  'valorant-win64-shipping.exe': { name: 'VALORANT', type: 'playing', details: 'Rekabetçi' },
  'valorant.exe': { name: 'VALORANT', type: 'playing', details: 'Rekabetçi' },
  'leagueclientux.exe': { name: 'League of Legends', type: 'playing', details: 'Sihirdar Vadisi' },
  'league of legends.exe': { name: 'League of Legends', type: 'playing', details: 'Oyunda' },
  'cs2.exe': { name: 'Counter-Strike 2', type: 'playing', details: 'Rekabetçi Maç' },
  'csgo.exe': { name: 'Counter-Strike: Global Offensive', type: 'playing', details: 'Oyunda' },
  'dota2.exe': { name: 'Dota 2', type: 'playing', details: 'Oyunda' },
  'overwatch.exe': { name: 'Overwatch 2', type: 'playing', details: 'Oyunda' },
  'r5apex.exe': { name: 'Apex Legends', type: 'playing', details: 'Battle Royale' },
  'fortniteclient-win64-shipping.exe': { name: 'Fortnite', type: 'playing', details: 'Battle Royale' },
  'rocketleague.exe': { name: 'Rocket League', type: 'playing', details: 'Dereceli Maç' },
  'rainbowsix.exe': { name: 'Tom Clancy\'s Rainbow Six Siege', type: 'playing', details: 'Oyunda' },
  'pubg.exe': { name: 'PUBG: BATTLEGROUNDS', type: 'playing', details: 'Hayatta Kalma' },
  'tslgame.exe': { name: 'PUBG: BATTLEGROUNDS', type: 'playing', details: 'Hayatta Kalma' },

  // Sandbox & Survival
  'javaw.exe': { name: 'Minecraft', type: 'playing', details: 'Dünyayı Keşfediyor' },
  'minecraft.exe': { name: 'Minecraft', type: 'playing', details: 'Dünyayı Keşfediyor' },
  'bedrock.exe': { name: 'Minecraft Bedrock', type: 'playing', details: 'Oyunda' },
  'robloxplayerbeta.exe': { name: 'Roblox', type: 'playing', details: 'Deneyim Keşfinde' },
  'terraria.exe': { name: 'Terraria', type: 'playing', details: 'Keşif ve İnşa' },
  'rustclient.exe': { name: 'Rust', type: 'playing', details: 'Hayatta Kalma' },
  'valheim.exe': { name: 'Valheim', type: 'playing', details: 'Viking Dünyası' },
  'palworld-win64-shipping.exe': { name: 'Palworld', type: 'playing', details: 'Pal Dünyasında' },

  // AAA & Open World RPGs
  'gta5.exe': { name: 'Grand Theft Auto V', type: 'playing', details: 'Los Santos' },
  'gta_sa.exe': { name: 'GTA: San Andreas', type: 'playing', details: 'San Andreas' },
  'cyberpunk2077.exe': { name: 'Cyberpunk 2077', type: 'playing', details: 'Night City' },
  'witcher3.exe': { name: 'The Witcher 3: Wild Hunt', type: 'playing', details: 'Kıta Keşfinde' },
  'eldenring.exe': { name: 'ELDEN RING', type: 'playing', details: 'Lands Between' },
  'bg3.exe': { name: 'Baldur\'s Gate 3', type: 'playing', details: 'Faerûn Macerası' },
  'bg3_dx11.exe': { name: 'Baldur\'s Gate 3', type: 'playing', details: 'Faerûn Macerası' },
  'rdr2.exe': { name: 'Red Dead Redemption 2', type: 'playing', details: 'Vahşi Batı' },
  'starfield.exe': { name: 'Starfield', type: 'playing', details: 'Galaksi Keşfi' },
  'blackmythwukong-win64-shipping.exe': { name: 'Black Myth: Wukong', type: 'playing', details: 'Kader Yolculuğu' },
  'genshinimpact.exe': { name: 'Genshin Impact', type: 'playing', details: 'Teyvat' },
  'honkaistarrail.exe': { name: 'Honkai: Star Rail', type: 'playing', details: 'Astral Express' },
  'wutheringwaves.exe': { name: 'Wuthering Waves', type: 'playing', details: 'Solaris-3' },

  // Strategy & Simulation
  'eu4.exe': { name: 'Europa Universalis IV', type: 'playing', details: 'İmparatorluk Yönetimi' },
  'hoi4.exe': { name: 'Hearts of Iron IV', type: 'playing', details: 'Dünya Savaşı' },
  'stellaris.exe': { name: 'Stellaris', type: 'playing', details: 'Galaktik İmparatorluk' },
  'f1_24.exe': { name: 'EA SPORTS F1 24', type: 'playing', details: 'Grand Prix' },
  'fc24.exe': { name: 'EA SPORTS FC 24', type: 'playing', details: 'Futbol Maçı' },
  'fc25.exe': { name: 'EA SPORTS FC 25', type: 'playing', details: 'Futbol Maçı' },
  'eurotrucks2.exe': { name: 'Euro Truck Simulator 2', type: 'playing', details: 'Yollarda' },
  'ats.exe': { name: 'American Truck Simulator', type: 'playing', details: 'Yollarda' },
  'flightsimulator.exe': { name: 'Microsoft Flight Simulator', type: 'playing', details: 'Gökyüzünde' },

  // Creative & Software Development
  'code.exe': { name: 'Visual Studio Code', type: 'coding', details: 'Kod Geliştiriyor' },
  'devenv.exe': { name: 'Visual Studio', type: 'coding', details: 'Proje Geliştiriyor' },
  'webstorm64.exe': { name: 'WebStorm', type: 'coding', details: 'Frontend Geliştiriyor' },
  'pycharm64.exe': { name: 'PyCharm', type: 'coding', details: 'Python Kodluyor' },
  'blender.exe': { name: 'Blender', type: 'creating', details: '3D Modelleme' },
  'photoshop.exe': { name: 'Adobe Photoshop', type: 'creating', details: 'Tasarım Yapıyor' },
  'illustrator.exe': { name: 'Adobe Illustrator', type: 'creating', details: 'Vektör Çiziyor' },
  'premiere.exe': { name: 'Adobe Premiere Pro', type: 'creating', details: 'Video Kurguluyor' },
  'afterfx.exe': { name: 'Adobe After Effects', type: 'creating', details: 'Görsel Efektler' },
  'unity.exe': { name: 'Unity Editor', type: 'creating', details: 'Oyun Tasarlıyor' },
  'unrealeditor.exe': { name: 'Unreal Engine', type: 'creating', details: 'Oyun Tasarlıyor' },
  'fl64.exe': { name: 'FL Studio', type: 'listening', details: 'Müzik Üretiyor' },
  'ableton live 11 suite.exe': { name: 'Ableton Live', type: 'listening', details: 'Müzik Üretiyor' }
}

class GameDetector {
  constructor(onUpdateCallback) {
    this.onUpdate = onUpdateCallback || (() => {})
    this.currentActivity = null
    this.intervalId = null
    this.isScanning = false
    this.startedAt = null
  }

  start(intervalMs = 4000) {
    if (this.intervalId) clearInterval(this.intervalId)
    this.scan()
    this.intervalId = setInterval(() => this.scan(), intervalMs)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  scan() {
    if (this.isScanning) return
    this.isScanning = true

    if (process.platform === 'win32') {
      this.scanWindows()
    } else {
      this.scanUnix()
    }
  }

  scanWindows() {
    // Fast PowerShell command that gets running process names
    const psCmd = 'Get-Process | Select-Object -ExpandProperty ProcessName'
    exec(`powershell -NoProfile -NonInteractive -Command "${psCmd}"`, { timeout: 3500 }, (err, stdout) => {
      this.isScanning = false
      if (err || !stdout) return

      const lines = stdout.toLowerCase().split(/\r?\n/).map(s => s.trim()).filter(Boolean)
      const foundMatch = this.matchProcess(lines)
      this.handleMatchResult(foundMatch)
    })
  }

  scanUnix() {
    exec('ps -e -o comm=', { timeout: 3000 }, (err, stdout) => {
      this.isScanning = false
      if (err || !stdout) return

      const lines = stdout.toLowerCase().split(/\r?\n/).map(s => s.trim()).filter(Boolean)
      const foundMatch = this.matchProcess(lines)
      this.handleMatchResult(foundMatch)
    })
  }

  matchProcess(processList) {
    for (const [exeName, meta] of Object.entries(GAME_DATABASE)) {
      const bareName = exeName.replace(/\.exe$/i, '').toLowerCase()
      if (processList.includes(bareName) || processList.includes(exeName.toLowerCase())) {
        return meta
      }
    }
    return null
  }

  handleMatchResult(detected) {
    if (detected) {
      const currentName = this.currentActivity?.name
      if (currentName !== detected.name) {
        this.startedAt = Date.now()
        this.currentActivity = {
          type: detected.type || 'playing',
          name: detected.name,
          details: detected.details || 'Oyunda',
          auto: true,
          startedAt: this.startedAt
        }
        this.onUpdate(this.currentActivity)
      }
    } else {
      if (this.currentActivity) {
        this.currentActivity = null
        this.startedAt = null
        this.onUpdate(null)
      }
    }
  }
}

module.exports = { GameDetector, GAME_DATABASE }
