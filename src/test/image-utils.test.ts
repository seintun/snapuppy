import { describe, it, expect } from 'vitest';
import {
  calculateScaledDimensions,
  isValidImageFile,
  isImageTooLarge,
  DEFAULT_COMPRESSION_OPTIONS,
} from '@/lib/image-utils';

describe('image-utils', () => {
  describe('calculateScaledDimensions', () => {
    it('returns original dimensions when under max', () => {
      expect(calculateScaledDimensions(800, 600, 1024)).toEqual({ width: 800, height: 600 });
    });

    it('scales down width when width exceeds max', () => {
      const result = calculateScaledDimensions(2048, 1536, 1024);
      expect(result.width).toBe(1024);
      expect(result.height).toBe(768);
    });

    it('scales down height when height exceeds max', () => {
      const result = calculateScaledDimensions(800, 1200, 1024);
      expect(result.width).toBe(683);
      expect(result.height).toBe(1024);
    });

    it('scales proportionally for square images', () => {
      const result = calculateScaledDimensions(2000, 2000, 1024);
      expect(result.width).toBe(1024);
      expect(result.height).toBe(1024);
    });

    it('handles edge case of exact max dimension', () => {
      expect(calculateScaledDimensions(1024, 768, 1024)).toEqual({ width: 1024, height: 768 });
    });

    it('handles very small images', () => {
      expect(calculateScaledDimensions(100, 100, 1024)).toEqual({ width: 100, height: 100 });
    });

    it('handles non-standard aspect ratios', () => {
      const result = calculateScaledDimensions(3000, 500, 1024);
      expect(result.width).toBe(1024);
      expect(result.height).toBe(171);
    });
  });

  describe('isValidImageFile', () => {
    it('returns true for valid JPEG', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      expect(isValidImageFile(file)).toBe(true);
    });

    it('returns true for valid PNG', () => {
      const file = new File([''], 'test.png', { type: 'image/png' });
      expect(isValidImageFile(file)).toBe(true);
    });

    it('returns true for valid WebP', () => {
      const file = new File([''], 'test.webp', { type: 'image/webp' });
      expect(isValidImageFile(file)).toBe(true);
    });

    it('returns true for GIF (for compatibility)', () => {
      const file = new File([''], 'test.gif', { type: 'image/gif' });
      expect(isValidImageFile(file)).toBe(true);
    });

    it('returns false for non-image files', () => {
      const file = new File([''], 'test.pdf', { type: 'application/pdf' });
      expect(isValidImageFile(file)).toBe(false);
    });

    it('returns false for text files', () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' });
      expect(isValidImageFile(file)).toBe(false);
    });

    it('returns false for video files', () => {
      const file = new File([''], 'test.mp4', { type: 'video/mp4' });
      expect(isValidImageFile(file)).toBe(false);
    });

    it('handles unknown file types gracefully', () => {
      const file = new File([''], 'test.unknown', { type: 'application/octet-stream' });
      expect(isValidImageFile(file)).toBe(false);
    });
  });

  describe('isImageTooLarge', () => {
    it('returns false for small files', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });
      expect(isImageTooLarge(file, 10)).toBe(false);
    });

    it('returns true for files exceeding limit', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 });
      expect(isImageTooLarge(file, 10)).toBe(true);
    });

    it('uses default 10MB limit when not specified', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
      expect(isImageTooLarge(file)).toBe(true);
    });

    it('returns false for files exactly at limit', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 });
      expect(isImageTooLarge(file, 10)).toBe(false);
    });

    it('handles files just under the limit', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 9.9 * 1024 * 1024 });
      expect(isImageTooLarge(file, 10)).toBe(false);
    });
  });

  describe('DEFAULT_COMPRESSION_OPTIONS', () => {
    it('has sensible defaults', () => {
      expect(DEFAULT_COMPRESSION_OPTIONS.maxDimension).toBe(1024);
      expect(DEFAULT_COMPRESSION_OPTIONS.quality).toBe(0.85);
      expect(DEFAULT_COMPRESSION_OPTIONS.format).toBe('webp');
    });

    it('can be used as base for custom options', () => {
      const custom = { ...DEFAULT_COMPRESSION_OPTIONS, quality: 0.9 };
      expect(custom.maxDimension).toBe(1024);
      expect(custom.quality).toBe(0.9);
    });
  });

  describe('exports', () => {
    it('exports all public functions', async () => {
      const mod = await import('@/lib/image-utils');
      expect(typeof mod.calculateScaledDimensions).toBe('function');
      expect(typeof mod.supportsWebP).toBe('function');
      expect(typeof mod.compressImage).toBe('function');
      expect(typeof mod.compressImageWithAutoFormat).toBe('function');
      expect(typeof mod.isValidImageFile).toBe('function');
      expect(typeof mod.isImageTooLarge).toBe('function');
      expect(typeof mod.DEFAULT_COMPRESSION_OPTIONS).toBe('object');
    });
  });
});
