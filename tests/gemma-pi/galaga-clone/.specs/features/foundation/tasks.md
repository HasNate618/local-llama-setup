# TASKS: Foundation (FEAT-001)

## [T-001] Project Boilerplate & Phaser Setup
- **Description:** Clean up the default Vite template and set up a minimal Phaser 3 configuration.
- **Where:** `galaga-clone/src/main.ts`, `galaga-clone/index.html`
- **Depends on:** None
- **Done when:**
    - `index.html` has a `<div id="game"></div>`.
    - `main.ts` initializes a Phaser game instance.
    - The game canvas appears in the browser.
- **Tests:** `npm run dev` shows a blank canvas.

## [T-002] Background & Main Scene
- **Description:** Implement the `MainScene` and a simple starfield background.
- **Where:** `galaga-clone/src/scenes/MainScene.ts`
- **Depends on:** [T-001]
- **Done when:**
    - A black background with white stars is visible.
    - The `MainScene` is correctly added to the Phaser game config.
- **Tests:** Visual inspection of the running game.

## [T-003] Player Implementation
- **Description:** Create the `Player` class and integrate it into `MainScene` with movement.
- **Where:** `galaga-clone/src/entities/Player.ts`, `galaga-clone/src/scenes/MainScene.ts`
- **Depends on:** [T-002]
- **Done when:**
    - A blue rectangle (player) is visible at the bottom.
    - The player moves left/right using arrow keys/WASD.
    - The player cannot move off-screen.
- **Tests:** Keyboard input test.

## [T-004] Shooting Mechanics
- **Description:** Implement the `Bullet` class and the player's ability to fire.
- **Where:** `galaga-clone/src/entities/Bullet.ts`, `galaga-clone/src/entities/Player.ts`, `galaga-clone/src/scenes/MainScene.ts`
- **Depends on:** [T-003]
- **Done when:**
    - Pressing Spacebar spawns a yellow bullet.
    - Bullets move upwards.
    - Bullets are destroyed upon leaving the top of the screen.
    - Shooting has a cooldown (cannot fire a continuous beam).
- **Tests:** Rapidly pressing Spacebar to verify cooldown and bullet cleanup.

## [T-005] Final Verification
- **Description:** Ensure all requirements of FEAT-001 are met and no obvious bugs exist.
- **Depends on:** [T-004]
- **Done when:** All [REQ-xxx] in `spec.md` are satisfied.
- **Tests:** Manual walkthrough of all features.
