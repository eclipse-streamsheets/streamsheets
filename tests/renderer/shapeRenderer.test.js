import { ShapeRenderer } from '../../src/renderer/shapeRenderer.js';
import { preloadImage } from '../../src/utils/imageLoader.js';

describe('ShapeRenderer - FILLPATTERN double-buffering', () => {
  let originalImage;
  let renderer;
  let dummyElement;

  beforeEach(() => {
    renderer = new ShapeRenderer();
    dummyElement = {
      style: {
        backgroundImage: 'url("data:image/png;base64,initialPattern")',
        backgroundColor: ''
      }
    };

    originalImage = global.Image;
  });

  afterEach(() => {
    global.Image = originalImage;
  });

  test('does not clear existing backgroundImage while new base64 image is loading', async () => {
    let triggerLoad;

    global.Image = class MockImage {
      constructor() {
        this.onload = null;
        this.onerror = null;
        this.complete = false;
        triggerLoad = () => {
          this.complete = true;
          if (this.onload) this.onload();
        };
      }
      set src(value) {
        this._src = value;
      }
      get src() {
        return this._src;
      }
    };

    const newPattern = 'data:image/png;base64,newPatternData';
    const renderPromise = renderer.renderFillPattern(dummyElement, newPattern);

    // Verify style has NOT been cleared immediately (no flicker)
    expect(dummyElement.style.backgroundImage).toBe('url("data:image/png;base64,initialPattern")');

    // Trigger the off-screen image load
    triggerLoad();
    await renderPromise;

    // Verify style is updated only after load completes
    expect(dummyElement.style.backgroundImage).toBe(`url("${newPattern}")`);
  });

  test('handles stale responses when multiple pattern renders are initiated', async () => {
    const triggerLoads = [];

    global.Image = class MockImage {
      constructor() {
        this.onload = null;
        this.onerror = null;
        this.complete = false;
        const index = triggerLoads.length;
        triggerLoads.push(() => {
          this.complete = true;
          if (this.onload) this.onload();
        });
      }
      set src(val) { this._src = val; }
      get src() { return this._src; }
    };

    const pattern1 = 'data:image/png;base64,pattern1';
    const pattern2 = 'data:image/png;base64,pattern2';

    const p1 = renderer.renderFillPattern(dummyElement, pattern1);
    const p2 = renderer.renderFillPattern(dummyElement, pattern2);

    // Resolve first load later than second
    triggerLoads[1]();
    await p2;
    expect(dummyElement.style.backgroundImage).toBe(`url("${pattern2}")`);

    triggerLoads[0]();
    await p1;
    // Style should still be pattern2, discarding the obsolete earlier request
    expect(dummyElement.style.backgroundImage).toBe(`url("${pattern2}")`);
  });

  test('renderShape delegates to renderFillPattern when fillType is FILLPATTERN', async () => {
    global.Image = class MockImage {
      set src(val) {
        this._src = val;
        setTimeout(() => {
          this.complete = true;
          if (this.onload) this.onload();
        }, 0);
      }
    };

    const pattern = 'data:image/png;base64,testPattern';
    await renderer.renderShape(dummyElement, {
      fillType: 'FILLPATTERN',
      fillPattern: pattern
    });

    expect(dummyElement.style.backgroundImage).toBe(`url("${pattern}")`);
  });

  test('preloadImage rejects when image error occurs', async () => {
    global.Image = class MockImage {
      set src(val) {
        setTimeout(() => {
          if (this.onerror) this.onerror(new Error('Load error'));
        }, 0);
      }
    };

    await expect(preloadImage('data:image/png;base64,invalid')).rejects.toThrow('Load error');
  });
});
