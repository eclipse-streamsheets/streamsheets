import { preloadImage } from '../utils/imageLoader.js';

/**
 * ShapeRenderer handles rendering shapes and their styles, including FILLPATTERN.
 */
export class ShapeRenderer {
  constructor() {
    // Track active loading requests per element to prevent race conditions
    this.pendingLoads = new WeakMap();
  }

  /**
   * Applies a fill pattern to an element using double-buffering.
   * Instead of clearing the current pattern immediately, pre-loads the new base64
   * image into an off-screen Image object and only updates the element's style
   * once the 'onload' event has triggered to prevent flickering.
   *
   * @param {HTMLElement} element - The target DOM element.
   * @param {string} base64Image - The new base64 image data URI.
   * @returns {Promise<void>} Resolves when the pattern has been updated.
   */
  async renderFillPattern(element, base64Image) {
    if (!element) {
      throw new Error('Target element is required for renderFillPattern');
    }

    if (!base64Image) {
      element.style.backgroundImage = 'none';
      return;
    }

    // Token to uniquely identify this load operation for the element
    const currentToken = Symbol('loadToken');
    this.pendingLoads.set(element, currentToken);

    try {
      // Pre-load the new base64 image into an off-screen Image object
      await preloadImage(base64Image);

      // Verify this is still the most recent request for this element
      if (this.pendingLoads.get(element) === currentToken) {
        element.style.backgroundImage = `url("${base64Image}")`;
      }
    } catch (error) {
      if (this.pendingLoads.get(element) === currentToken) {
        throw error;
      }
    } finally {
      if (this.pendingLoads.get(element) === currentToken) {
        this.pendingLoads.delete(element);
      }
    }
  }

  /**
   * Renders a shape element with given properties and fill pattern.
   *
   * @param {HTMLElement} element - The target DOM element.
   * @param {Object} options - Shape styling options.
   * @param {string} [options.fillType] - Type of fill ('COLOR', 'FILLPATTERN', etc.).
   * @param {string} [options.fillPattern] - Base64 image data URI for fill pattern.
   * @param {string} [options.fillColor] - Solid fill color.
   */
  async renderShape(element, options = {}) {
    if (!element) {
      throw new Error('Target element is required');
    }

    if (options.fillType === 'FILLPATTERN' && options.fillPattern) {
      await this.renderFillPattern(element, options.fillPattern);
    } else if (options.fillType === 'COLOR' && options.fillColor) {
      element.style.backgroundImage = 'none';
      element.style.backgroundColor = options.fillColor;
    }
  }
}
