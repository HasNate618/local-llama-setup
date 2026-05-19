import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';

export class MainScene extends Phaser.Scene {
  private stars!: Phaser.GameObjects.TileSprite;
  private player!: Player;
  private bullets!: Phaser.Physics.Arcade.Group;

  constructor() {
    super('MainScene');
  }

  preload() {
    console.log('MainScene: Preloading...');
  }

  create() {
    console.log('MainScene: Creating...');
    
    // 1. Set a solid background color first to ensure we see SOMETHING
    this.cameras.main.setBackgroundColor('#000000');

    // 2. Create a simple starfield using a built-in shape if possible, 
    // or just a simple TileSprite with a generated texture.
    this.createStarfield();

    // 3. Create player
    this.player = new Player(this, 400, 550);
    console.log('MainScene: Player created at', this.player.x, this.player.y);

    // 4. Create bullet group
    this.bullets = this.physics.add.group({
      classType: Bullet,
      maxSize: 20,
      runChildUpdate: true
    });

    // 5. Add some text so we know the scene is active
    this.add.text(400, 100, 'Galaga Clone - Running', { fontSize: '32px', color: '#00ff00' }).setOrigin(0.5);
    console.log('MainScene: Text and Player ready.');
  }

  private createStarfield() {
    const width = 800;
    const height = 600;
    
    // Create a simple canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 2;
        ctx.fillRect(x, y, size, size);
      }

      // Use the canvas as a texture via DataURL for better compatibility
      const dataUrl = canvas.toDataURL();
      this.textures.addBase64('stars', dataUrl);
      this.stars = this.add.tileSprite(0, 0, width, height, 'stars').setOrigin(0, 0);
      console.log('MainScene: Starfield texture created via DataURL.');
    } else {
      console.error('MainScene: Could not get canvas context.');
    }
  }

  update() {
    // Scroll the starfield slowly downwards
    if (this.stars) {
      this.stars.tilePositionY -= 0.5;
    }

    // Update player
    this.player.update();

    // Handle shooting
    const spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    if (spaceKey && spaceKey.isDown) {
      this.player.fire(this.bullets);
    }

    // Cleanup bullets
    const bulletChildren = this.bullets.getChildren();
    if (bulletChildren) {
        bulletChildren.forEach((bullet: any) => {
          if (bullet.active && bullet.y < 0) {
            bullet.setActive(false);
            bullet.setVisible(false);
            if (bullet.body) {
                bullet.body.stop();
            }
          }
        });
    }
  }
}
