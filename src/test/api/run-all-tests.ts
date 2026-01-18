/* eslint-disable no-console */
/**
 * Test runner that executes all API tests and provides a summary
 *
 * Usage: npm run test:api
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestResult {
  name: string;
  passed: number;
  failed: number;
  duration: number;
  output: string;
  error?: string;
}

const TEST_FILES = [
  { name: "POST /api/quizzes/generate", file: "test-post-quizzes-generate.ts" },
  { name: "GET /api/quizzes", file: "test-get-quizzes.ts" },
  { name: "GET /api/quizzes/:id", file: "test-get-quizzes-id.ts" },
  { name: "PATCH /api/quizzes/:id", file: "test-patch-quizzes-id.ts" },
  { name: "DELETE /api/quizzes/:id", file: "test-delete-quiz.ts" },
  { name: "GET /api/questions/:id", file: "test-get-question.ts" },
  { name: "PATCH /api/questions/:id", file: "test-patch-question.ts" },
  { name: "DELETE /api/questions/:id", file: "test-delete-question.ts" },
  { name: "POST /api/questions/:id/regenerate", file: "test-regenerate-answers.ts" },
  { name: "PATCH /api/answers/:id", file: "test-patch-answers-id.ts" },
];

function countTestResults(output: string): { passed: number; failed: number } {
  const lines = output.split("\n");
  let passed = 0;
  let failed = 0;

  for (const line of lines) {
    // Count success markers
    if (line.includes("✅ SUCCESS")) {
      passed++;
    }
    // Count failure markers (but not "should fail" success cases)
    if (line.includes("❌ FAILED") || (line.includes("❌ ERROR") && !line.includes("Got expected"))) {
      failed++;
    }
  }

  return { passed, failed };
}

async function runTest(testFile: string, testName: string): Promise<TestResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const testPath = join(__dirname, testFile);

    let output = "";
    let error = "";

    const child = spawn("npx", ["tsx", testPath], {
      shell: true,
      env: process.env,
    });

    child.stdout.on("data", (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text); // Pass through to console
    });

    child.stderr.on("data", (data) => {
      const text = data.toString();
      error += text;
      process.stderr.write(text); // Pass through to console
    });

    child.on("close", (code) => {
      const duration = Date.now() - startTime;
      const { passed, failed } = countTestResults(output);

      // If there was an error that wasn't caught, count it as a failure
      if (code !== 0 && passed === 0 && failed === 0) {
        resolve({
          name: testName,
          passed: 0,
          failed: 1,
          duration,
          output,
          error: error || `Process exited with code ${code}`,
        });
      } else {
        resolve({
          name: testName,
          passed,
          failed,
          duration,
          output,
          error: error || undefined,
        });
      }
    });
  });
}

async function runAllTests() {
  console.log("\n🚀 Starting API Test Suite\n");
  console.log("=".repeat(80));
  console.log("\n");

  const results: TestResult[] = [];

  for (const test of TEST_FILES) {
    const result = await runTest(test.file, test.name);
    results.push(result);
    console.log("\n" + "-".repeat(80) + "\n");
  }

  // Print summary
  console.log("\n");
  console.log("=".repeat(80));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(80));
  console.log("\n");

  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const totalTests = totalPassed + totalFailed;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  // Overall statistics
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`⏱️  Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log("\n");

  // Per-endpoint results
  console.log("Results by endpoint:");
  console.log("-".repeat(80));

  for (const result of results) {
    const status = result.failed === 0 ? "✅" : "❌";
    const testCount = result.passed + result.failed;
    console.log(
      `${status} ${result.name.padEnd(40)} ${result.passed}/${testCount} passed (${(result.duration / 1000).toFixed(2)}s)`
    );
  }

  // Failed tests details
  if (totalFailed > 0) {
    console.log("\n");
    console.log("❌ FAILED TESTS:");
    console.log("-".repeat(80));

    for (const result of results) {
      if (result.failed > 0) {
        console.log(`\n${result.name}:`);

        // Extract failed test details from output
        const lines = result.output.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes("❌ FAILED") || (line.includes("❌ ERROR") && !line.includes("Got expected"))) {
            // Print test name (usually a few lines above)
            for (let j = Math.max(0, i - 3); j <= i; j++) {
              if (lines[j].trim().startsWith("Test ")) {
                console.log(`  • ${lines[j].trim()}`);
                break;
              }
            }
            console.log(`    ${line.trim()}`);
          }
        }

        if (result.error) {
          console.log(`  Error: ${result.error}`);
        }
      }
    }
  }

  console.log("\n");
  console.log("=".repeat(80));

  // Exit with error code if any tests failed
  if (totalFailed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((error) => {
  console.error("Fatal error running tests:", error);
  process.exit(1);
});

export {};
