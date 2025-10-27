import React from 'react';
import { add } from './utils';

describe('App', () => {
  it('should be defined', () => {
    // Basic test to ensure the test environment works
    expect(React).toBeDefined();
    expect(true).toBe(true);
  });

  it('should have React available', () => {
    expect(typeof React.createElement).toBe('function');
  });

  it('utils should work', () => {
    expect(add(1, 2)).toBe(3);
  });
});
