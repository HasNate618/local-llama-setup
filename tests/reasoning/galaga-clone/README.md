# Galaga Clone

A complete arcade-style space shooter built with HTML5 Canvas and vanilla JavaScript.

## Features

- 🚀 **Classic gameplay** - Navigate waves of alien enemies
- 👾 **Multiple enemy types** - Fighters, Scouts, Tanks, Speeders
- 👹 **Epic boss battles** - 4 phases with unique attack patterns
- ⚡ **Power-up zones** - Spread shot, Triple shot, Shield, Boost
- 🎨 **Polished graphics** - Particle effects, glowing visuals, smooth animations
- 📱 **Responsive controls** - Keyboard + mouse support

## Controls

| Action | Keys |
|--------|------|
| Move Left/Right | ← → or A D |
| Move Up/Down | ↑ ↓ or W S |
| Shoot | Space or Click |
| Boost | SHIFT (when powered up) |
| Pause | P |

## How to Play

1. Open `index.html` in a web browser
2. Click "START MISSION" to begin
3. Navigate through waves of enemies
4. Collect power-ups by flying over colored zones
5. Survive the boss battle at wave 5
6. Achieve the highest score possible!

## Game Mechanics

### Enemy Types
- **Fighter** - Balanced stats, standard threats
- **Scout** - Fast and evasive, shoots frequently
- **Tank** - High health, slow but dangerous
- **Speeder** - Extremely fast, low health

### Power-Up Zones
| Zone | Effect | Duration |
|------|--------|----------|
| 🔱 Spread | Wider shot spread | 10 seconds |
| ⚡ Triple | Fire 3 bullets simultaneously | 10 seconds |
| 🛡️ Shield | Immune to damage | 15 seconds |
| ⚙️ Boost | Double movement speed | 10 seconds |

### Boss Battle
The boss has 4 phases with increasing difficulty:
- **Phase 1** - Sine wave spread attacks
- **Phase 2** - Zigzag patterns
- **Phase 3** - Wide spread shots
- **Phase 4** - Rain pattern assault

## Technical Details

- **Engine**: Pure JavaScript, no frameworks
- **Rendering**: HTML5 Canvas API
- **Storage**: localStorage for high scores
- **Performance**: Optimized particle system, efficient collision detection

## File Structure

```
galaga-clone/
├── index.html    # Main HTML with UI and styling
├── game.js       # Complete game engine and logic
└── README.md     # This file
```

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (Chromium)
- Firefox
- Safari
- Opera

## License

Free to use and modify. Enjoy the game!
