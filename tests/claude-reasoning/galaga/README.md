# Galaga Clone 🚀

A complete Galaga-style arcade game built with HTML5 Canvas and vanilla JavaScript.

## Features

- **Classic Arcade Gameplay**: Navigate through waves of enemy ships
- **Boss Battles**: Face massive alien motherships at each wave
- **Power-ups**:
  - 🛡️ **Shield (S)**: Reduces damage taken
  - 🧲 **Magnet (M)**: Fires spread shots
  - ⚡ **Dash (D)**: Super speed movement
- **Visual Effects**: Particle explosions, glowing effects, smooth animations
- **Progressive Difficulty**: Each wave gets harder with more enemies and faster bosses

## How to Run

### Option 1: Using the Python Server (Recommended)

```bash
cd galaga
python3 server.py
```

Then open http://localhost:8000 in your browser.

### Option 2: Using Python's Built-in Server

```bash
python3 -m http.server 8000
```

### Option 3: Any Static File Server

The game works with any HTTP server. Just serve the `galaga/` directory.

## Controls

| Action | Controls |
|--------|----------|
| Move Ship | W/A/S/D or Arrow Keys |
| Shoot | Mouse Click or Spacebar |
| Aim | Mouse Cursor |
| Pause | P |
| Restart | R |

## Game Structure

```
galaga/
├── index.html    # Main HTML file with UI
├── game.js       # Complete game logic
└── server.py     # Simple HTTP server
```

## Game Flow

1. **Start Screen**: Press "START MISSION"
2. **Wave Play**: Enemies approach, attack, then retreat
3. **Boss Battle**: Massive alien mothership appears
4. **Repeat**: Progress through waves indefinitely
5. **Victory**: Survive all waves (no end condition - endless play!)

## Technical Details

- **Canvas**: 1200x800 resolution, responsive scaling
- **Rendering**: Pure HTML5 Canvas API with no external libraries
- **Architecture**: Object-oriented design with classes for:
  - PlayerShip, EnemyShip, BossShip
  - Bullet, Powerup, Particle, Star
- **Game Loop**: requestAnimationFrame based

## Screenshots

The game features:
- Parallax starfield background
- Glowing neon effects
- Smooth particle explosions
- Boss health bars and attack indicators
- Power-up collection feedback

## License

Free to use and modify. Built with ❤️ for arcade gaming nostalgia.
