# SPEC: Foundation (FEAT-001)

## Description
Establish the core game loop, player movement, and shooting mechanics to create a playable "vertical slice" of movement and combat.

## Requirements

### [REQ-001] Project Infrastructure
- Use Vite with TypeScript.
- Integrate Phaser 3.
- Ensure a clean development environment.

### [REQ-002] Basic Game Loop
- A Phaser Scene that initializes and runs.
- A scrolling or static starfield background (placeholder).
- A game loop that updates at 60 FPS.

### [REQ-003] Player Ship
- A player ship represented by a rectangle or simple sprite.
- Positioned at the bottom of the screen.
- Movement: Left/Right (Arrow keys or A/D).
- Bounds checking: Player cannot move off-screen.

### [REQ-004] Shooting Mechanics
- Ability to fire bullets (Spacebar).
- Bullets move upwards.
- Bullets are destroyed when they leave the screen.
- Limited rate of fire (cooldown).

## Verification Criteria
- [ ] Game starts and displays a background.
- [ ] Player ship can move left and right within screen bounds.
- [ ] Player ship can fire bullets that travel upwards.
- [ ] Bullets are removed from the scene when they leave the top.
- [ ] Project compiles without TypeScript errors.

## Implementation Notes
- Use Phaser's `Arcade Physics` for movement and collisions.
- For assets, use `this.add.rectangle` or `this.add.circle` as placeholders to avoid external asset dependency in this phase.
