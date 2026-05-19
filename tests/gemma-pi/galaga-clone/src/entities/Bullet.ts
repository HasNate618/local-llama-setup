import Phaser from 'phaser';

export class Bullet extends Phaser.GameObjects.Rectangle {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, 4, 10, 0xffff00);
    
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.x = x;
    this.y = y;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
        body.setVelocityY(-500);
    }
  }

  public update() {
    // Bullet destruction is handled by the group or in MainScene
  }
}
