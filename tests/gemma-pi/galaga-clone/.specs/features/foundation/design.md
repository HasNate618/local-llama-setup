# DESIGN: Foundation (FEAT-001)

## Architecture

### Component Breakdown

#### 1. `MainScene` (Phaser.Scene)
- **Responsibilities:**
    - Initialize the game world.
    - Manage the background (starfield).
    - Manage the groups for players and bullets.
    - Handle input listener registration.
    - Update loop for checking game state.

#### 2. `Player` (Phaser.GameObjects.Rectangle + Arcade Physics)
- **Properties:**
    - `speed`: Movement speed.
    - `lastFired`: Timestamp of last shot (for cooldown).
    - `fireRate`: Cooldown in milliseconds.
- **Methods:**
    - `update()`: Handle movement input and bounds checking.
    - `fire()`: Create a bullet object and add it to the bullet group.

#### 3. `Bullet` (Phaser.GameObjects.Rectangle + Arcade Physics)
- **Properties:**
    - `speed`: Upward velocity.
- **Methods:**
    - `destroyOnExit()`: Logic to remove the bullet when it leaves the top of the screen.

## Data Flow
1. **Input:** Keyboard event (Left, Right, Space).
2. **Update:** `MainScene.update()` calls `Player.update()`.
3. **Physics:** Phaser physics engine handles position and collision updates.
4. **Cleanup:** Bullet exit detection removes objects from the physics group.

## Visual Representation (Placeholders)
- **Background:** Black color with small white circles (stars).
- **Player:** Blue rectangle (width: 40, height: 30).
- **Bullet:** Yellow rectangle (width: 4, height: 10).
- **Enemy (for future):** Red rectangle.

## Implementation Strategy
- Use `this.physics.add.group()` for bullets to manage them efficiently.
- Use `setCollideWorldBounds(true)` for the player.
- Implement the starfield using a `TileSprite` or a loop of small circles.
