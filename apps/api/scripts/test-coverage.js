#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Comprehensive Test Coverage Analysis...\n');

// Test categories and their configurations
const testCategories = [
  {
    name: 'Unit Tests',
    pattern: '**/*.test.ts',
    description: 'Testing individual functions and methods',
    target: 90
  },
  {
    name: 'Integration Tests',
    pattern: '**/*.integration.test.ts',
    description: 'Testing API endpoints and database interactions',
    target: 85
  },
  {
    name: 'E2E Tests',
    pattern: '**/*.e2e.test.ts',
    description: 'Testing complete user journeys',
    target: 80
  },
  {
    name: 'Performance Tests',
    pattern: '**/*.loadTests.test.ts',
    description: 'Testing system performance under load',
    target: 70
  },
  {
    name: 'Security Tests',
    pattern: '**/*.penetrationTests.test.ts',
    description: 'Testing security vulnerabilities',
    target: 75
  }
];

// Coverage thresholds
const coverageThresholds = {
  global: {
    branches: 80,
    functions: 85,
    lines: 85,
    statements: 85
  },
  './src/controllers/': {
    branches: 90,
    functions: 95,
    lines: 90,
    statements: 90
  },
  './src/services/': {
    branches: 85,
    functions: 90,
    lines: 85,
    statements: 85
  },
  './src/middleware/': {
    branches: 80,
    functions: 85,
    lines: 80,
    statements: 80
  }
};

async function runTests() {
  const results = {
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      coverage: {}
    },
    categories: {},
    details: []
  };

  console.log('📊 Running Test Categories:\n');

  for (const category of testCategories) {
    console.log(`\n🔍 Running ${category.name}...`);
    console.log(`   Description: ${category.description}`);
    console.log(`   Target Coverage: ${category.target}%`);
    
    try {
      // Run tests for this category
      const testCommand = `npm test -- --testPathPattern="${category.pattern}" --coverage --coverageReporters=json --coverageReporters=text --coverageReporters=lcov --passWithNoTests`;
      
      console.log(`   Command: ${testCommand}`);
      
      const output = execSync(testCommand, { 
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: process.cwd()
      });

      // Parse test results
      const lines = output.split('\n');
      const testResults = lines.filter(line => 
        line.includes('Tests:') || 
        line.includes('Test Suites:') ||
        line.includes('Snapshots:') ||
        line.includes('Time:')
      );

      // Extract coverage information
      const coverageLines = lines.filter(line => 
        line.includes('All files') ||
        line.includes('Coverage summary') ||
        line.includes('Uncovered')
      );

      results.categories[category.name] = {
        output: output,
        testResults: testResults,
        coverage: coverageLines,
        status: 'completed'
      };

      console.log(`   ✅ ${category.name} completed successfully`);

    } catch (error) {
      console.log(`   ❌ ${category.name} failed: ${error.message}`);
      results.categories[category.name] = {
        error: error.message,
        status: 'failed'
      };
    }
  }

  // Run comprehensive coverage analysis
  console.log('\n📈 Running Comprehensive Coverage Analysis...');
  
  try {
    const coverageCommand = 'npm test -- --coverage --coverageReporters=json --coverageReporters=text --coverageReporters=lcov --coverageReporters=html --passWithNoTests';
    
    console.log(`   Command: ${coverageCommand}`);
    
    const coverageOutput = execSync(coverageCommand, { 
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: process.cwd()
    });

    // Parse coverage results
    const coverageData = parseCoverageOutput(coverageOutput);
    results.summary.coverage = coverageData;

    console.log('   ✅ Coverage analysis completed');

  } catch (error) {
    console.log(`   ❌ Coverage analysis failed: ${error.message}`);
    results.summary.coverage = { error: error.message };
  }

  // Generate detailed report
  generateDetailedReport(results);

  return results;
}

function parseCoverageOutput(output) {
  const lines = output.split('\n');
  const coverage = {
    summary: {},
    files: {},
    thresholds: coverageThresholds
  };

  // Extract summary coverage
  const summaryLine = lines.find(line => line.includes('All files'));
  if (summaryLine) {
    const match = summaryLine.match(/(\d+(?:\.\d+)?)%/g);
    if (match && match.length >= 4) {
      coverage.summary = {
        statements: parseFloat(match[0]),
        branches: parseFloat(match[1]),
        functions: parseFloat(match[2]),
        lines: parseFloat(match[3])
      };
    }
  }

  // Extract file-level coverage
  lines.forEach(line => {
    if (line.includes('|') && !line.includes('All files') && !line.includes('File')) {
      const parts = line.split('|').map(part => part.trim());
      if (parts.length >= 6) {
        const fileName = parts[0];
        const fileCoverage = {
          statements: parseFloat(parts[1]) || 0,
          branches: parseFloat(parts[2]) || 0,
          functions: parseFloat(parts[3]) || 0,
          lines: parseFloat(parts[4]) || 0
        };
        coverage.files[fileName] = fileCoverage;
      }
    }
  });

  return coverage;
}

function generateDetailedReport(results) {
  console.log('\n📋 Generating Detailed Coverage Report...\n');

  const report = {
    timestamp: new Date().toISOString(),
    summary: results.summary,
    categories: results.categories,
    recommendations: [],
    issues: []
  };

  // Analyze coverage against thresholds
  if (results.summary.coverage.summary) {
    const coverage = results.summary.coverage.summary;
    
    console.log('📊 Coverage Summary:');
    console.log(`   Statements: ${coverage.statements}% (Target: ${coverageThresholds.global.statements}%)`);
    console.log(`   Branches: ${coverage.branches}% (Target: ${coverageThresholds.global.branches}%)`);
    console.log(`   Functions: ${coverage.functions}% (Target: ${coverageThresholds.global.functions}%)`);
    console.log(`   Lines: ${coverage.lines}% (Target: ${coverageThresholds.global.lines}%)`);

    // Check if thresholds are met
    if (coverage.statements < coverageThresholds.global.statements) {
      report.issues.push(`Statements coverage (${coverage.statements}%) below threshold (${coverageThresholds.global.statements}%)`);
    }
    if (coverage.branches < coverageThresholds.global.branches) {
      report.issues.push(`Branches coverage (${coverage.branches}%) below threshold (${coverageThresholds.global.branches}%)`);
    }
    if (coverage.functions < coverageThresholds.global.functions) {
      report.issues.push(`Functions coverage (${coverage.functions}%) below threshold (${coverageThresholds.global.functions}%)`);
    }
    if (coverage.lines < coverageThresholds.global.lines) {
      report.issues.push(`Lines coverage (${coverage.lines}%) below threshold (${coverageThresholds.global.lines}%)`);
    }

    // Generate recommendations
    if (coverage.branches < 80) {
      report.recommendations.push('Add more test cases to cover edge cases and error conditions');
    }
    if (coverage.functions < 85) {
      report.recommendations.push('Ensure all public methods and functions have corresponding tests');
    }
    if (coverage.lines < 85) {
      report.recommendations.push('Add integration tests for API endpoints and database interactions');
    }
  }

  // Analyze test categories
  console.log('\n📁 Test Categories Analysis:');
  Object.entries(results.categories).forEach(([category, data]) => {
    console.log(`   ${category}: ${data.status}`);
    if (data.status === 'failed') {
      report.issues.push(`${category} tests failed: ${data.error}`);
    }
  });

  // Generate recommendations based on missing test categories
  const missingCategories = testCategories.filter(cat => 
    !results.categories[cat.name] || results.categories[cat.name].status === 'failed'
  );

  if (missingCategories.length > 0) {
    report.recommendations.push(`Implement missing test categories: ${missingCategories.map(cat => cat.name).join(', ')}`);
  }

  // Save report to file
  const reportPath = path.join(process.cwd(), 'coverage-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n💾 Detailed report saved to: ${reportPath}`);

  // Display issues and recommendations
  if (report.issues.length > 0) {
    console.log('\n⚠️  Issues Found:');
    report.issues.forEach(issue => console.log(`   - ${issue}`));
  }

  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(rec => console.log(`   - ${rec}`));
  }

  // Overall status
  const hasIssues = report.issues.length > 0;
  const hasFailedCategories = Object.values(results.categories).some(cat => cat.status === 'failed');
  
  if (hasIssues || hasFailedCategories) {
    console.log('\n❌ Test coverage analysis completed with issues');
    process.exit(1);
  } else {
    console.log('\n✅ Test coverage analysis completed successfully');
    process.exit(0);
  }
}

// Run the analysis
runTests().catch(error => {
  console.error('❌ Test coverage analysis failed:', error);
  process.exit(1);
});
