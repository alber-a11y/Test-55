import Phaser from 'phaser';

/** Menu-type scene that simply rebuilds itself when the logical game width changes. */
export abstract class BaseScene extends Phaser.Scene {
  protected sceneData: any = {};

  init(data: any): void {
    this.sceneData = data ?? {};
  }

  protected rebuildOnResize(): void {
    const handler = () => {
      if (this.scene.isActive()) this.scene.restart(this.sceneData);
    };
    this.scale.on('resize', handler);
    this.events.once('shutdown', () => this.scale.off('resize', handler));
  }

  get W(): number {
    return this.scale.width;
  }

  get H(): number {
    return this.scale.height;
  }
}
