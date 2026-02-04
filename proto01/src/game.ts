import { hex, neighbors, hexToString, Direction, neighbor, hexDistance } from './hex';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => {
      this.resize();
      this.render();
    });
  }

  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start(): void {
    this.render();
    this.testHexSystem();
  }

  private testHexSystem(): void {
    // Test the hex coordinate system
    console.log('=== Hex Coordinate System Test ===');

    const center = hex(3, 3);
    console.log(`Center: ${hexToString(center)} (dcol=${center.dcol})`);

    console.log('\nNeighbors:');
    const dirs = ['E', 'W', 'NE', 'NW', 'SE', 'SW'];
    neighbors(center).forEach((n, i) => {
      console.log(`  ${dirs[i]}: ${hexToString(n)} (dcol=${n.dcol})`);
    });

    console.log('\nDistance tests:');
    const targets = [
      hex(3, 3),  // same
      hex(4, 3),  // 1 east
      hex(3, 2),  // 1 north (diagonal)
      hex(5, 3),  // 2 east
      hex(3, 1),  // 2 north
      hex(5, 1),  // 2 NE diagonal
    ];
    targets.forEach(t => {
      console.log(`  ${hexToString(center)} -> ${hexToString(t)}: dist=${hexDistance(center, t)}`);
    });

    console.log('\n=== Test Complete ===');
  }

  render(): void {
    const { ctx, canvas } = this;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#eee';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Proto01 - Underchex (PROTO-01.2: Hex coords)', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '16px sans-serif';
    ctx.fillText('Check console for hex system tests', canvas.width / 2, canvas.height / 2 + 20);
  }
}
