async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');

  // Optional: Clean up any test artifacts or temporary files
  // For now, we'll let the database stay seeded for potential manual inspection
  // The next test run will reset it anyway via global-setup

  console.log('✅ Test environment cleanup complete');
}

export default globalTeardown;