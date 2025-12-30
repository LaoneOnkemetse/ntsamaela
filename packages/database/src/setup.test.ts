describe('Database setup script', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.DISABLE_PRISMA = 'true';
  });

  it('should export setupDatabase function', async () => {
    const mod = await import('../setup');
    expect(typeof mod.setupDatabase).toBe('function');
  });
});


