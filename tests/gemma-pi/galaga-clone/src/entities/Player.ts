import Phaser from 'phaser';
import { Bullet } from './Bullet';

export class Player extends Phaser.GameObjects.Rectangle {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private speed: number = 300;
  private lastFired: number = 0;
  private fireRate: number = 300;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 40, 30, 0x0000ff);
    
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const input = scene.input.keyboard;
    if (input) {
        this.cursors = input.createCursorKeys();
    }

    // Set physics properties
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
        body.setCollideWorldBounds(true);
    }
  }

  public fire(bulletGroup: Phaser.Physics.Arcade.Group) {
    const now = this.scene.time.now;
    if (now - this.lastFired > this.fireRate) {
      const bullet = bulletGroup.get(this.x, this.y - 20) as Bullet;
      if (bullet) {
        bullet.setActive(true);
        bullet.setVisible(true);
      }
      this.lastFired = now;
    }
  }

  public update() {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body || !this.cursors) return;

    if (this.cursors.left.isDown || this.scene.input.keyboard?.addKey('A')?.isDown) {
      body.setVelocityX(-this.speed);
    } else if (this.cursors.right.isDown || this.scene.input.keyboard?.addKey('D')?.isDown) {
      body.setVelocityX(this.speed);
    } else {
      body.setVelocityX(0);
    }
  }
}
