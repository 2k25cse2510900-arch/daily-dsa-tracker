"use strict";

/**
 * DSAverse — Module 8: AI Algorithm Visualizer Engine
 *
 * Responsibilities:
 * 1. Structured algorithm registry with 20 core DSA algorithms across all major categories.
 * 2. Deterministic state-transition step generation for Array, Pointer, Hash Map, Stack, Queue,
 *    Linked List, Tree, Graph, and Dynamic Programming algorithms.
 * 3. Strict schema validation for AI-assisted code visualizations.
 * 4. Deterministic line-by-line dry-run trace generation and variable inspector.
 * 5. Side-by-side algorithmic comparisons (time/space complexity, data structures, trade-offs).
 */

const ALGORITHM_CATEGORIES = Object.freeze([
  "Searching",
  "Sorting",
  "Hashing",
  "Two Pointers",
  "Sliding Window",
  "Prefix Sum",
  "Stacks",
  "Queues",
  "Linked Lists",
  "Trees",
  "Graphs",
  "Dynamic Programming"
]);

/**
 * 1. Binary Search
 */
function generateBinarySearchSteps(input = {}) {
  const arr = Array.isArray(input.array) ? [...input.array] : [1, 3, 5, 7, 9, 11, 13, 15];
  const target = input.target !== undefined ? Number(input.target) : 7;
  const steps = [];

  let low = 0;
  let high = arr.length - 1;
  let foundIndex = -1;

  steps.push({
    stepIndex: 0,
    operation: "pointer_move",
    pseudocodeLine: 1,
    explanation: `Initialize search bounds: low = 0 (value: ${arr[low]}), high = ${high} (value: ${arr[high]}). Target is ${target}.`,
    state: {
      array: [...arr],
      activeIndices: [low, high],
      pointers: { low, high },
      variables: { low, high, target }
    },
    visualMetadata: {
      invariant: "If target exists in sorted array, it must lie in range [low, high]."
    }
  });

  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    const midVal = arr[mid];

    steps.push({
      stepIndex: steps.length,
      operation: "pointer_move",
      pseudocodeLine: 3,
      explanation: `Calculate midpoint: mid = low + ⌊(high - low) / 2⌋ = ${low} + ⌊(${high} - ${low}) / 2⌋ = ${mid} (value: ${midVal}).`,
      state: {
        array: [...arr],
        activeIndices: [mid],
        pointers: { low, high, mid },
        variables: { low, high, mid, midVal, target }
      },
      visualMetadata: {
        invariant: `Inspecting middle element arr[${mid}] = ${midVal}.`
      }
    });

    steps.push({
      stepIndex: steps.length,
      operation: "compare",
      pseudocodeLine: 4,
      explanation: `Compare arr[mid] (${midVal}) with target (${target}).`,
      state: {
        array: [...arr],
        activeIndices: [mid],
        pointers: { low, high, mid },
        variables: { low, high, mid, midVal, target, condition: `${midVal} === ${target}` }
      }
    });

    if (midVal === target) {
      foundIndex = mid;
      steps.push({
        stepIndex: steps.length,
        operation: "complete",
        pseudocodeLine: 5,
        explanation: `Target ${target} found at index ${mid}! Returning index ${mid}.`,
        state: {
          array: [...arr],
          activeIndices: [mid],
          pointers: { low, high, mid },
          highlighted: [mid],
          variables: { low, high, mid, result: mid }
        },
        visualMetadata: {
          bannerText: `Target ${target} located at index ${mid}.`
        }
      });
      break;
    } else if (midVal < target) {
      steps.push({
        stepIndex: steps.length,
        operation: "pointer_move",
        pseudocodeLine: 7,
        explanation: `Since arr[mid] (${midVal}) < target (${target}), target must be in the right half. Move low to mid + 1 (${mid + 1}).`,
        state: {
          array: [...arr],
          activeIndices: [mid],
          pointers: { low: mid + 1, high, mid },
          variables: { low: mid + 1, high, target }
        }
      });
      low = mid + 1;
    } else {
      steps.push({
        stepIndex: steps.length,
        operation: "pointer_move",
        pseudocodeLine: 9,
        explanation: `Since arr[mid] (${midVal}) > target (${target}), target must be in the left half. Move high to mid - 1 (${mid - 1}).`,
        state: {
          array: [...arr],
          activeIndices: [mid],
          pointers: { low, high: mid - 1, mid },
          variables: { low, high: mid - 1, target }
        }
      });
      high = mid - 1;
    }
  }

  if (foundIndex === -1) {
    steps.push({
      stepIndex: steps.length,
      operation: "complete",
      pseudocodeLine: 11,
      explanation: `Search range exhausted (low > high). Target ${target} is not present in the array. Returning -1.`,
      state: {
        array: [...arr],
        pointers: { low, high },
        variables: { low, high, result: -1 }
      }
    });
  }

  return {
    algorithmId: "binary-search",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: foundIndex
  };
}

/**
 * 2. Linear Search
 */
function generateLinearSearchSteps(input = {}) {
  const arr = Array.isArray(input.array) ? [...input.array] : [14, 9, 27, 4, 18, 42, 6];
  const target = input.target !== undefined ? Number(input.target) : 18;
  const steps = [];
  let foundIndex = -1;

  steps.push({
    stepIndex: 0,
    operation: "pointer_move",
    pseudocodeLine: 1,
    explanation: `Start linear scan from index 0. Target value is ${target}.`,
    state: { array: [...arr], activeIndices: [0], pointers: { i: 0 }, variables: { i: 0, target } }
  });

  for (let i = 0; i < arr.length; i++) {
    steps.push({
      stepIndex: steps.length,
      operation: "compare",
      pseudocodeLine: 3,
      explanation: `Examine element at index ${i}: arr[${i}] = ${arr[i]}. Compare with target ${target}.`,
      state: { array: [...arr], activeIndices: [i], pointers: { i }, variables: { i, "arr[i]": arr[i], target } }
    });

    if (arr[i] === target) {
      foundIndex = i;
      steps.push({
        stepIndex: steps.length,
        operation: "complete",
        pseudocodeLine: 4,
        explanation: `Match found! arr[${i}] === ${target}. Returning index ${i}.`,
        state: { array: [...arr], activeIndices: [i], highlighted: [i], pointers: { i }, variables: { result: i } }
      });
      break;
    }
  }

  if (foundIndex === -1) {
    steps.push({
      stepIndex: steps.length,
      operation: "complete",
      pseudocodeLine: 6,
      explanation: `Scanned all ${arr.length} elements without finding ${target}. Returning -1.`,
      state: { array: [...arr], pointers: { i: arr.length }, variables: { result: -1 } }
    });
  }

  return {
    algorithmId: "linear-search",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: foundIndex
  };
}

/**
 * 3. Bubble Sort
 */
function generateBubbleSortSteps(input = {}) {
  const arr = Array.isArray(input.array) ? [...input.array] : [5, 1, 4, 2, 8];
  const n = arr.length;
  const steps = [];

  steps.push({
    stepIndex: 0,
    operation: "compare",
    pseudocodeLine: 1,
    explanation: `Begin Bubble Sort on array of size ${n}. Outer loop runs up to ${n - 1} passes.`,
    state: { array: [...arr], activeIndices: [], variables: { n } }
  });

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      steps.push({
        stepIndex: steps.length,
        operation: "compare",
        pseudocodeLine: 4,
        explanation: `Pass ${i + 1}: Compare adjacent elements arr[${j}] (${arr[j]}) and arr[${j + 1}] (${arr[j + 1]}).`,
        state: { array: [...arr], activeIndices: [j, j + 1], pointers: { j, "j+1": j + 1 }, variables: { i, j } }
      });

      if (arr[j] > arr[j + 1]) {
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
        swapped = true;

        steps.push({
          stepIndex: steps.length,
          operation: "swap",
          pseudocodeLine: 5,
          explanation: `Since ${temp} > ${arr[j]}, swap them. Array is now [${arr.join(", ")}].`,
          state: { array: [...arr], activeIndices: [j, j + 1], swapped: [j, j + 1], pointers: { j, "j+1": j + 1 }, variables: { i, j } }
        });
      }
    }

    steps.push({
      stepIndex: steps.length,
      operation: "pointer_move",
      pseudocodeLine: 7,
      explanation: `End of Pass ${i + 1}: Element arr[${n - i - 1}] (${arr[n - i - 1]}) is now sorted in its final position.`,
      state: { array: [...arr], highlighted: Array.from({ length: i + 1 }, (_, k) => n - 1 - k), variables: { i, sortedCount: i + 1 } }
    });

    if (!swapped) break;
  }

  steps.push({
    stepIndex: steps.length,
    operation: "complete",
    pseudocodeLine: 8,
    explanation: `Array is fully sorted: [${arr.join(", ")}].`,
    state: { array: [...arr], highlighted: arr.map((_, i) => i), variables: { completed: true } }
  });

  return {
    algorithmId: "bubble-sort",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: arr
  };
}

/**
 * 4. Selection Sort
 */
function generateSelectionSortSteps(input = {}) {
  const arr = Array.isArray(input.array) ? [...input.array] : [64, 25, 12, 22, 11];
  const n = arr.length;
  const steps = [];

  steps.push({
    stepIndex: 0,
    operation: "pointer_move",
    pseudocodeLine: 1,
    explanation: `Begin Selection Sort. We will iteratively find the minimum element in the unsorted suffix and place it at the beginning.`,
    state: { array: [...arr], activeIndices: [], variables: { n } }
  });

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;

    steps.push({
      stepIndex: steps.length,
      operation: "pointer_move",
      pseudocodeLine: 3,
      explanation: `Pass ${i + 1}: Assume initial minimum is at index ${i} (value: ${arr[i]}).`,
      state: { array: [...arr], activeIndices: [i], pointers: { i, min: i }, variables: { i, minIdx: i } }
    });

    for (let j = i + 1; j < n; j++) {
      steps.push({
        stepIndex: steps.length,
        operation: "compare",
        pseudocodeLine: 5,
        explanation: `Compare candidate arr[${j}] (${arr[j]}) with current minimum arr[${minIdx}] (${arr[minIdx]}).`,
        state: { array: [...arr], activeIndices: [j, minIdx], pointers: { i, j, min: minIdx }, variables: { i, j, minIdx } }
      });

      if (arr[j] < arr[minIdx]) {
        minIdx = j;
        steps.push({
          stepIndex: steps.length,
          operation: "pointer_move",
          pseudocodeLine: 6,
          explanation: `Found new smaller element arr[${j}] = ${arr[j]}. Update min index to ${j}.`,
          state: { array: [...arr], activeIndices: [minIdx], pointers: { i, min: minIdx }, variables: { i, minIdx } }
        });
      }
    }

    if (minIdx !== i) {
      const temp = arr[i];
      arr[i] = arr[minIdx];
      arr[minIdx] = temp;

      steps.push({
        stepIndex: steps.length,
        operation: "swap",
        pseudocodeLine: 8,
        explanation: `Swap minimum element ${arr[i]} into sorted position index ${i}. Array: [${arr.join(", ")}].`,
        state: { array: [...arr], activeIndices: [i, minIdx], swapped: [i, minIdx], pointers: { i }, variables: { i, minIdx } }
      });
    }
  }

  steps.push({
    stepIndex: steps.length,
    operation: "complete",
    pseudocodeLine: 10,
    explanation: `Selection sort completed. Array is fully sorted: [${arr.join(", ")}].`,
    state: { array: [...arr], highlighted: arr.map((_, i) => i), variables: { completed: true } }
  });

  return {
    algorithmId: "selection-sort",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: arr
  };
}

/**
 * 5. Insertion Sort
 */
function generateInsertionSortSteps(input = {}) {
  const arr = Array.isArray(input.array) ? [...input.array] : [12, 11, 13, 5, 6];
  const n = arr.length;
  const steps = [];

  steps.push({
    stepIndex: 0,
    operation: "pointer_move",
    pseudocodeLine: 1,
    explanation: `Begin Insertion Sort. Elements before index i form the sorted sub-array.`,
    state: { array: [...arr], activeIndices: [0], highlighted: [0], variables: { n } }
  });

  for (let i = 1; i < n; i++) {
    const key = arr[i];
    let j = i - 1;

    steps.push({
      stepIndex: steps.length,
      operation: "pointer_move",
      pseudocodeLine: 3,
      explanation: `Extract key = arr[${i}] (${key}). We will shift sorted elements greater than ${key} to the right.`,
      state: { array: [...arr], activeIndices: [i], pointers: { i, j }, variables: { i, key, j } }
    });

    while (j >= 0 && arr[j] > key) {
      steps.push({
        stepIndex: steps.length,
        operation: "compare",
        pseudocodeLine: 5,
        explanation: `Compare arr[${j}] (${arr[j]}) with key (${key}). Since ${arr[j]} > ${key}, shift ${arr[j]} to index ${j + 1}.`,
        state: { array: [...arr], activeIndices: [j, j + 1], pointers: { i, j }, variables: { key, j } }
      });

      arr[j + 1] = arr[j];
      j = j - 1;

      steps.push({
        stepIndex: steps.length,
        operation: "table_update",
        pseudocodeLine: 6,
        explanation: `Shifted element to right. Array is now [${arr.join(", ")}].`,
        state: { array: [...arr], activeIndices: [j + 1], pointers: { i, j }, variables: { key, j } }
      });
    }

    arr[j + 1] = key;
    steps.push({
      stepIndex: steps.length,
      operation: "table_update",
      pseudocodeLine: 8,
      explanation: `Insert key ${key} at index ${j + 1}. Sorted prefix is now indices 0 to ${i}.`,
      state: { array: [...arr], activeIndices: [j + 1], highlighted: Array.from({ length: i + 1 }, (_, k) => k), variables: { key, insertedAt: j + 1 } }
    });
  }

  steps.push({
    stepIndex: steps.length,
    operation: "complete",
    pseudocodeLine: 10,
    explanation: `Array is fully sorted: [${arr.join(", ")}].`,
    state: { array: [...arr], highlighted: arr.map((_, i) => i), variables: { completed: true } }
  });

  return {
    algorithmId: "insertion-sort",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: arr
  };
}

/**
 * 6. Merge Sort (Demonstrating Split & Merge)
 */
function generateMergeSortSteps(input = {}) {
  const arr = Array.isArray(input.array) ? [...input.array] : [38, 27, 43, 3, 9, 82, 10];
  const steps = [];

  steps.push({
    stepIndex: 0,
    operation: "pointer_move",
    pseudocodeLine: 1,
    explanation: `Begin Merge Sort on array: [${arr.join(", ")}]. Merge Sort uses Divide & Conquer with O(N log N) time complexity.`,
    state: { array: [...arr], activeIndices: [], variables: { length: arr.length } }
  });

  function merge(mainArr, start, mid, end) {
    const left = mainArr.slice(start, mid + 1);
    const right = mainArr.slice(mid + 1, end + 1);

    steps.push({
      stepIndex: steps.length,
      operation: "pointer_move",
      pseudocodeLine: 6,
      explanation: `Merging left subarray [${left.join(", ")}] (indices ${start}..${mid}) with right subarray [${right.join(", ")}] (indices ${mid + 1}..${end}).`,
      state: { array: [...mainArr], activeIndices: Array.from({ length: end - start + 1 }, (_, k) => start + k), pointers: { start, mid, end }, variables: { left, right } }
    });

    let i = 0, j = 0, k = start;
    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) {
        mainArr[k] = left[i];
        steps.push({
          stepIndex: steps.length,
          operation: "compare",
          pseudocodeLine: 9,
          explanation: `Compare left[${i}] (${left[i]}) <= right[${j}] (${right[j]}): take ${left[i]} and place at index ${k}.`,
          state: { array: [...mainArr], activeIndices: [k], pointers: { k }, variables: { placed: left[i] } }
        });
        i++;
      } else {
        mainArr[k] = right[j];
        steps.push({
          stepIndex: steps.length,
          operation: "compare",
          pseudocodeLine: 12,
          explanation: `Compare left[${i}] (${left[i]}) > right[${j}] (${right[j]}): take ${right[j]} and place at index ${k}.`,
          state: { array: [...mainArr], activeIndices: [k], pointers: { k }, variables: { placed: right[j] } }
        });
        j++;
      }
      k++;
    }

    while (i < left.length) {
      mainArr[k] = left[i];
      steps.push({
        stepIndex: steps.length,
        operation: "table_update",
        pseudocodeLine: 15,
        explanation: `Append remaining left element ${left[i]} to index ${k}.`,
        state: { array: [...mainArr], activeIndices: [k], pointers: { k } }
      });
      i++;
      k++;
    }

    while (j < right.length) {
      mainArr[k] = right[j];
      steps.push({
        stepIndex: steps.length,
        operation: "table_update",
        pseudocodeLine: 17,
        explanation: `Append remaining right element ${right[j]} to index ${k}.`,
        state: { array: [...mainArr], activeIndices: [k], pointers: { k } }
      });
      j++;
      k++;
    }
  }

  function sort(mainArr, start, end) {
    if (start >= end) return;
    const mid = Math.floor((start + end) / 2);
    sort(mainArr, start, mid);
    sort(mainArr, mid + 1, end);
    merge(mainArr, start, mid, end);
  }

  const workingCopy = [...arr];
  sort(workingCopy, 0, workingCopy.length - 1);

  steps.push({
    stepIndex: steps.length,
    operation: "complete",
    pseudocodeLine: 20,
    explanation: `Merge Sort complete! Array fully ordered: [${workingCopy.join(", ")}].`,
    state: { array: [...workingCopy], highlighted: workingCopy.map((_, i) => i), variables: { completed: true } }
  });

  return {
    algorithmId: "merge-sort",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: workingCopy
  };
}

/**
 * 7. Quick Sort (Lomuto Partition)
 */
function generateQuickSortSteps(input = {}) {
  const arr = Array.isArray(input.array) ? [...input.array] : [10, 80, 30, 90, 40, 50, 70];
  const steps = [];

  steps.push({
    stepIndex: 0,
    operation: "pointer_move",
    pseudocodeLine: 1,
    explanation: `Begin Quick Sort with Lomuto partitioning on [${arr.join(", ")}].`,
    state: { array: [...arr], activeIndices: [], variables: { length: arr.length } }
  });

  function partition(mainArr, low, high) {
    const pivot = mainArr[high];
    let i = low - 1;

    steps.push({
      stepIndex: steps.length,
      operation: "pointer_move",
      pseudocodeLine: 4,
      explanation: `Partition range [${low}..${high}]: Choose pivot = arr[${high}] (${pivot}). Pointer i initialized to ${i}.`,
      state: { array: [...mainArr], activeIndices: [high], pointers: { low, high, pivot: high, i }, variables: { pivot, low, high } }
    });

    for (let j = low; j < high; j++) {
      steps.push({
        stepIndex: steps.length,
        operation: "compare",
        pseudocodeLine: 6,
        explanation: `Compare arr[${j}] (${mainArr[j]}) <= pivot (${pivot}).`,
        state: { array: [...mainArr], activeIndices: [j, high], pointers: { i, j, pivot: high }, variables: { "arr[j]": mainArr[j], pivot } }
      });

      if (mainArr[j] <= pivot) {
        i++;
        if (i !== j) {
          const temp = mainArr[i];
          mainArr[i] = mainArr[j];
          mainArr[j] = temp;

          steps.push({
            stepIndex: steps.length,
            operation: "swap",
            pseudocodeLine: 8,
            explanation: `Increment i to ${i} and swap arr[${i}] with arr[${j}]. Array: [${mainArr.join(", ")}].`,
            state: { array: [...mainArr], activeIndices: [i, j], swapped: [i, j], pointers: { i, j, pivot: high } }
          });
        }
      }
    }

    const temp = mainArr[i + 1];
    mainArr[i + 1] = mainArr[high];
    mainArr[high] = temp;
    const pivotIndex = i + 1;

    steps.push({
      stepIndex: steps.length,
      operation: "swap",
      pseudocodeLine: 10,
      explanation: `Place pivot ${pivot} into its sorted position at index ${pivotIndex}. Elements left of ${pivotIndex} are <= ${pivot}; right are > ${pivot}.`,
      state: { array: [...mainArr], activeIndices: [pivotIndex], highlighted: [pivotIndex], pointers: { pivot: pivotIndex } }
    });

    return pivotIndex;
  }

  function quickSortHelper(mainArr, low, high) {
    if (low < high) {
      const pi = partition(mainArr, low, high);
      quickSortHelper(mainArr, low, pi - 1);
      quickSortHelper(mainArr, pi + 1, high);
    }
  }

  const working = [...arr];
  quickSortHelper(working, 0, working.length - 1);

  steps.push({
    stepIndex: steps.length,
    operation: "complete",
    pseudocodeLine: 13,
    explanation: `Quick Sort completed! Sorted array: [${working.join(", ")}].`,
    state: { array: [...working], highlighted: working.map((_, i) => i), variables: { completed: true } }
  });

  return {
    algorithmId: "quick-sort",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: working
  };
}

/**
 * 8. Two Sum (Hash Map Approach)
 */
function generateTwoSumSteps(input = {}) {
  const arr = Array.isArray(input.array) ? [...input.array] : [2, 7, 11, 15];
  const target = input.target !== undefined ? Number(input.target) : 9;
  const steps = [];
  const map = {};
  let result = null;

  steps.push({
    stepIndex: 0,
    operation: "pointer_move",
    pseudocodeLine: 1,
    explanation: `Initialize empty Hash Map to track seen elements and their indices. Target = ${target}.`,
    state: { array: [...arr], hashMap: {}, activeIndices: [], variables: { target } }
  });

  for (let i = 0; i < arr.length; i++) {
    const num = arr[i];
    const complement = target - num;

    steps.push({
      stepIndex: steps.length,
      operation: "pointer_move",
      pseudocodeLine: 3,
      explanation: `Examine element arr[${i}] = ${num}. Calculate complement = target (${target}) - num (${num}) = ${complement}.`,
      state: { array: [...arr], hashMap: { ...map }, activeIndices: [i], pointers: { i }, variables: { i, num, complement } }
    });

    steps.push({
      stepIndex: steps.length,
      operation: "hash_lookup",
      pseudocodeLine: 4,
      explanation: `Look up complement (${complement}) in hash map. Map currently contains: ${Object.keys(map).length ? JSON.stringify(map) : "{ empty }"}.`,
      state: { array: [...arr], hashMap: { ...map }, activeIndices: [i], pointers: { i }, variables: { lookupKey: complement, found: complement in map } }
    });

    if (complement in map) {
      const matchIndex = map[complement];
      result = [matchIndex, i];

      steps.push({
        stepIndex: steps.length,
        operation: "complete",
        pseudocodeLine: 5,
        explanation: `Complement ${complement} found in map at index ${matchIndex}! Solution pair: [${matchIndex}, ${i}] (values: ${arr[matchIndex]} + ${num} = ${target}).`,
        state: { array: [...arr], hashMap: { ...map }, activeIndices: [matchIndex, i], highlighted: [matchIndex, i], variables: { result } },
        visualMetadata: { bannerText: `Solution Found: indices [${matchIndex}, ${i}]` }
      });
      break;
    }

    map[num] = i;
    steps.push({
      stepIndex: steps.length,
      operation: "hash_insert",
      pseudocodeLine: 7,
      explanation: `Complement not found. Insert arr[${i}] = ${num} into hash map with value index ${i}.`,
      state: { array: [...arr], hashMap: { ...map }, activeIndices: [i], pointers: { i }, variables: { inserted: { key: num, index: i } } }
    });
  }

  if (!result) {
    steps.push({
      stepIndex: steps.length,
      operation: "complete",
      pseudocodeLine: 9,
      explanation: `No two numbers sum to target ${target}. Returning empty result.`,
      state: { array: [...arr], hashMap: { ...map }, variables: { result: [] } }
    });
  }

  return {
    algorithmId: "two-sum",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: result || []
  };
}

/**
 * 9. Two Pointers (Target Sum on Sorted Array)
 */
function generateTwoPointersSteps(input = {}) {
  const arr = Array.isArray(input.array) ? [...input.array] : [1, 2, 4, 6, 8, 11, 15];
  const target = input.target !== undefined ? Number(input.target) : 10;
  const steps = [];

  let left = 0;
  let right = arr.length - 1;
  let result = null;

  steps.push({
    stepIndex: 0,
    operation: "pointer_move",
    pseudocodeLine: 1,
    explanation: `Array is sorted. Initialize left pointer at start (0) and right pointer at end (${right}). Target = ${target}.`,
    state: { array: [...arr], pointers: { L: left, R: right }, activeIndices: [left, right], variables: { left, right, target } }
  });

  while (left < right) {
    const currentSum = arr[left] + arr[right];

    steps.push({
      stepIndex: steps.length,
      operation: "compare",
      pseudocodeLine: 3,
      explanation: `Calculate sum: arr[${left}] (${arr[left]}) + arr[${right}] (${arr[right]}) = ${currentSum}. Compare with target (${target}).`,
      state: { array: [...arr], pointers: { L: left, R: right }, activeIndices: [left, right], variables: { currentSum, target } }
    });

    if (currentSum === target) {
      result = [left, right];
      steps.push({
        stepIndex: steps.length,
        operation: "complete",
        pseudocodeLine: 5,
        explanation: `Sum equals target! Pair found at indices [${left}, ${right}] (${arr[left]} + ${arr[right]} = ${target}).`,
        state: { array: [...arr], pointers: { L: left, R: right }, activeIndices: [left, right], highlighted: [left, right], variables: { result } }
      });
      break;
    } else if (currentSum < target) {
      steps.push({
        stepIndex: steps.length,
        operation: "pointer_move",
        pseudocodeLine: 7,
        explanation: `Sum (${currentSum}) < target (${target}). To increase the sum, advance left pointer from ${left} to ${left + 1}.`,
        state: { array: [...arr], pointers: { L: left + 1, R: right }, activeIndices: [left + 1, right], variables: { left: left + 1, right } }
      });
      left++;
    } else {
      steps.push({
        stepIndex: steps.length,
        operation: "pointer_move",
        pseudocodeLine: 9,
        explanation: `Sum (${currentSum}) > target (${target}). To decrease the sum, decrement right pointer from ${right} to ${right - 1}.`,
        state: { array: [...arr], pointers: { L: left, R: right - 1 }, activeIndices: [left, right - 1], variables: { left, right: right - 1 } }
      });
      right--;
    }
  }

  return {
    algorithmId: "two-pointers",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: result || []
  };
}

/**
 * 10. Sliding Window (Maximum Sum Subarray of Size K)
 */
function generateSlidingWindowSteps(input = {}) {
  const arr = Array.isArray(input.array) ? [...input.array] : [2, 1, 5, 1, 3, 2];
  const k = input.k !== undefined ? Number(input.k) : 3;
  const steps = [];

  let windowSum = 0;
  for (let i = 0; i < k; i++) windowSum += arr[i];
  let maxSum = windowSum;
  let maxStart = 0;

  steps.push({
    stepIndex: 0,
    operation: "pointer_move",
    pseudocodeLine: 1,
    explanation: `Initialize first window of size k = ${k} (indices 0..${k - 1}). Initial window sum = ${windowSum}.`,
    state: { array: [...arr], activeIndices: Array.from({ length: k }, (_, i) => i), pointers: { L: 0, R: k - 1 }, variables: { windowSum, maxSum, k } }
  });

  for (let i = k; i < arr.length; i++) {
    const leftIndex = i - k;
    const removedVal = arr[leftIndex];
    const addedVal = arr[i];

    steps.push({
      stepIndex: steps.length,
      operation: "pointer_move",
      pseudocodeLine: 4,
      explanation: `Slide window right: subtract leaving element arr[${leftIndex}] (${removedVal}) and add entering element arr[${i}] (${addedVal}).`,
      state: { array: [...arr], activeIndices: Array.from({ length: k }, (_, idx) => leftIndex + 1 + idx), pointers: { L: leftIndex + 1, R: i }, variables: { removedVal, addedVal } }
    });

    windowSum = windowSum - removedVal + addedVal;

    steps.push({
      stepIndex: steps.length,
      operation: "table_update",
      pseudocodeLine: 5,
      explanation: `New window sum = ${windowSum}. Compare with current max sum (${maxSum}).`,
      state: { array: [...arr], activeIndices: Array.from({ length: k }, (_, idx) => leftIndex + 1 + idx), pointers: { L: leftIndex + 1, R: i }, variables: { windowSum, maxSum } }
    });

    if (windowSum > maxSum) {
      maxSum = windowSum;
      maxStart = leftIndex + 1;
      steps.push({
        stepIndex: steps.length,
        operation: "table_update",
        pseudocodeLine: 6,
        explanation: `New maximum found! Updated maxSum = ${maxSum} starting at index ${maxStart}.`,
        state: { array: [...arr], activeIndices: Array.from({ length: k }, (_, idx) => maxStart + idx), highlighted: Array.from({ length: k }, (_, idx) => maxStart + idx), variables: { maxSum, maxStart } }
      });
    }
  }

  steps.push({
    stepIndex: steps.length,
    operation: "complete",
    pseudocodeLine: 8,
    explanation: `Sliding window traversal complete. Maximum subarray sum of size ${k} is ${maxSum} (window [${arr.slice(maxStart, maxStart + k).join(", ")}]).`,
    state: { array: [...arr], highlighted: Array.from({ length: k }, (_, idx) => maxStart + idx), variables: { maxSum, maxStart } }
  });

  return {
    algorithmId: "sliding-window",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: { maxSum, maxSubarray: arr.slice(maxStart, maxStart + k) }
  };
}

/**
 * 11. Prefix Sum (Range Sum Queries)
 */
function generatePrefixSumSteps(input = {}) {
  const arr = Array.isArray(input.array) ? [...input.array] : [3, 1, 4, 1, 5, 9, 2];
  const query = input.query || { left: 2, right: 5 };
  const steps = [];

  const prefix = new Array(arr.length + 1).fill(0);

  steps.push({
    stepIndex: 0,
    operation: "table_update",
    pseudocodeLine: 1,
    explanation: `Construct 1-indexed prefix sum array of size ${arr.length + 1}. prefix[0] = 0.`,
    state: { array: [...arr], dpTable: [0], variables: { length: arr.length } }
  });

  for (let i = 0; i < arr.length; i++) {
    prefix[i + 1] = prefix[i] + arr[i];
    steps.push({
      stepIndex: steps.length,
      operation: "table_update",
      pseudocodeLine: 3,
      explanation: `prefix[${i + 1}] = prefix[${i}] (${prefix[i]}) + arr[${i}] (${arr[i]}) = ${prefix[i + 1]}.`,
      state: { array: [...arr], activeIndices: [i], dpTable: [...prefix.slice(0, i + 2)], pointers: { i }, variables: { "prefix[i+1]": prefix[i + 1] } }
    });
  }

  const qL = Math.max(0, query.left);
  const qR = Math.min(arr.length - 1, query.right);
  const rangeSum = prefix[qR + 1] - prefix[qL];

  steps.push({
    stepIndex: steps.length,
    operation: "complete",
    pseudocodeLine: 6,
    explanation: `Answer query sum(arr[${qL}..${qR}]): formula is prefix[${qR + 1}] (${prefix[qR + 1]}) - prefix[${qL}] (${prefix[qL]}) = ${rangeSum} in O(1) time.`,
    state: {
      array: [...arr],
      activeIndices: Array.from({ length: qR - qL + 1 }, (_, k) => qL + k),
      highlighted: Array.from({ length: qR - qL + 1 }, (_, k) => qL + k),
      dpTable: [...prefix],
      variables: { qL, qR, rangeSum }
    }
  });

  return {
    algorithmId: "prefix-sum",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: { prefix, queryResult: rangeSum }
  };
}

/**
 * 12. Stack Operations
 */
function generateStackSteps(input = {}) {
  const operations = Array.isArray(input.operations) ? input.operations : [
    { type: "push", value: 10 },
    { type: "push", value: 20 },
    { type: "peek" },
    { type: "push", value: 30 },
    { type: "pop" },
    { type: "push", value: 40 }
  ];

  const stack = [];
  const steps = [];

  steps.push({
    stepIndex: 0,
    operation: "pointer_move",
    pseudocodeLine: 1,
    explanation: `Initialize empty stack. Stack enforces Last-In, First-Out (LIFO) discipline.`,
    state: { stack: [] }
  });

  for (const op of operations) {
    if (op.type === "push") {
      stack.push(op.value);
      steps.push({
        stepIndex: steps.length,
        operation: "stack_push",
        pseudocodeLine: 3,
        explanation: `PUSH(${op.value}): Add ${op.value} to the top of stack. Top is now ${op.value} (size: ${stack.length}).`,
        state: { stack: [...stack], variables: { top: op.value, size: stack.length } }
      });
    } else if (op.type === "pop") {
      const popped = stack.pop();
      steps.push({
        stepIndex: steps.length,
        operation: "stack_pop",
        pseudocodeLine: 6,
        explanation: `POP(): Remove and return top element (${popped}). Top is now ${stack.length ? stack[stack.length - 1] : "none"} (size: ${stack.length}).`,
        state: { stack: [...stack], variables: { popped, size: stack.length } }
      });
    } else if (op.type === "peek") {
      const top = stack.length ? stack[stack.length - 1] : null;
      steps.push({
        stepIndex: steps.length,
        operation: "compare",
        pseudocodeLine: 9,
        explanation: `PEEK(): Inspect top element without removing it. Current top = ${top}.`,
        state: { stack: [...stack], variables: { peek: top, size: stack.length } }
      });
    }
  }

  steps.push({
    stepIndex: steps.length,
    operation: "complete",
    pseudocodeLine: 11,
    explanation: `Stack sequence completed. Final stack state: [${stack.join(", ")}].`,
    state: { stack: [...stack] }
  });

  return {
    algorithmId: "stack-operations",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: stack
  };
}

/**
 * 13. Queue Operations
 */
function generateQueueSteps(input = {}) {
  const operations = Array.isArray(input.operations) ? input.operations : [
    { type: "enqueue", value: "A" },
    { type: "enqueue", value: "B" },
    { type: "enqueue", value: "C" },
    { type: "dequeue" },
    { type: "enqueue", value: "D" }
  ];

  const queue = [];
  const steps = [];

  steps.push({
    stepIndex: 0,
    operation: "pointer_move",
    pseudocodeLine: 1,
    explanation: `Initialize empty queue. Queue enforces First-In, First-Out (FIFO) discipline.`,
    state: { queue: [] }
  });

  for (const op of operations) {
    if (op.type === "enqueue") {
      queue.push(op.value);
      steps.push({
        stepIndex: steps.length,
        operation: "queue_enqueue",
        pseudocodeLine: 3,
        explanation: `ENQUEUE(${op.value}): Add element to the rear of the queue. Front = ${queue[0]}, Rear = ${op.value} (size: ${queue.length}).`,
        state: { queue: [...queue], variables: { front: queue[0], rear: op.value, size: queue.length } }
      });
    } else if (op.type === "dequeue") {
      const dequeued = queue.shift();
      steps.push({
        stepIndex: steps.length,
        operation: "queue_dequeue",
        pseudocodeLine: 6,
        explanation: `DEQUEUE(): Remove and return element from front of queue (${dequeued}). New front = ${queue.length ? queue[0] : "none"} (size: ${queue.length}).`,
        state: { queue: [...queue], variables: { dequeued, front: queue[0] || null, size: queue.length } }
      });
    }
  }

  steps.push({
    stepIndex: steps.length,
    operation: "complete",
    pseudocodeLine: 9,
    explanation: `Queue operations complete. Final queue contents: [${queue.join(", ")}].`,
    state: { queue: [...queue] }
  });

  return {
    algorithmId: "queue-operations",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: queue
  };
}

/**
 * 14. Linked List Traversal
 */
function generateLinkedListTraversalSteps(input = {}) {
  const values = Array.isArray(input.nodes) ? input.nodes : [10, 20, 30, 40, 50];
  const steps = [];

  steps.push({
    stepIndex: 0,
    operation: "pointer_move",
    pseudocodeLine: 1,
    explanation: `Initialize current pointer at head node (${values[0]}).`,
    state: { array: [...values], activeIndices: [0], pointers: { curr: 0 }, variables: { currentVal: values[0] } }
  });

  for (let i = 0; i < values.length; i++) {
    steps.push({
      stepIndex: steps.length,
      operation: "node_visit",
      pseudocodeLine: 3,
      explanation: `Visit node with value ${values[i]} at position ${i}. Process node.`,
      state: { array: [...values], activeIndices: [i], highlighted: Array.from({ length: i + 1 }, (_, k) => k), pointers: { curr: i }, variables: { visited: values[i] } }
    });

    if (i < values.length - 1) {
      steps.push({
        stepIndex: steps.length,
        operation: "pointer_move",
        pseudocodeLine: 4,
        explanation: `Advance current pointer: curr = curr.next (next node value: ${values[i + 1]}).`,
        state: { array: [...values], activeIndices: [i + 1], pointers: { curr: i + 1 } }
      });
    }
  }

  steps.push({
    stepIndex: steps.length,
    operation: "complete",
    pseudocodeLine: 6,
    explanation: `Reached end of linked list (curr.next is null). Traversal complete across all ${values.length} nodes.`,
    state: { array: [...values], highlighted: values.map((_, i) => i) }
  });

  return {
    algorithmId: "linked-list-traversal",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: values
  };
}

/**
 * 15. Reverse Linked List
 */
function generateReverseLinkedListSteps(input = {}) {
  const values = Array.isArray(input.nodes) ? input.nodes : [1, 2, 3, 4, 5];
  const steps = [];

  steps.push({
    stepIndex: 0,
    operation: "pointer_move",
    pseudocodeLine: 1,
    explanation: `Initialize prev = null, curr = head (node ${values[0]}). We will reverse pointers in-place in O(N) time and O(1) space.`,
    state: { array: [...values], pointers: { prev: -1, curr: 0 }, variables: { prev: null, curr: values[0] } }
  });

  for (let i = 0; i < values.length; i++) {
    const nextVal = i + 1 < values.length ? values[i + 1] : null;

    steps.push({
      stepIndex: steps.length,
      operation: "pointer_move",
      pseudocodeLine: 4,
      explanation: `Step ${i + 1}: Save next node: nextNode = curr.next (${nextVal !== null ? `node ${nextVal}` : "null"}).`,
      state: { array: [...values], activeIndices: [i], pointers: { prev: i - 1, curr: i, next: i + 1 < values.length ? i + 1 : -1 }, variables: { curr: values[i], next: nextVal } }
    });

    steps.push({
      stepIndex: steps.length,
      operation: "table_update",
      pseudocodeLine: 5,
      explanation: `Reverse pointer: curr.next = prev (${i > 0 ? `node ${values[i - 1]}` : "null"}).`,
      state: { array: [...values], activeIndices: [i], pointers: { prev: i - 1, curr: i } }
    });

    steps.push({
      stepIndex: steps.length,
      operation: "pointer_move",
      pseudocodeLine: 6,
      explanation: `Advance pointers: prev = curr (node ${values[i]}), curr = nextNode.`,
      state: { array: [...values], pointers: { prev: i, curr: i + 1 < values.length ? i + 1 : -1 } }
    });
  }

  const reversed = [...values].reverse();
  steps.push({
    stepIndex: steps.length,
    operation: "complete",
    pseudocodeLine: 8,
    explanation: `Reversal complete! New head is node ${reversed[0]}. Reversed sequence: [${reversed.join(" -> ")}].`,
    state: { array: [...reversed], highlighted: reversed.map((_, i) => i) }
  });

  return {
    algorithmId: "reverse-linked-list",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: reversed
  };
}

/**
 * 16. Binary Tree Inorder Traversal (L -> Root -> R)
 */
function generateTreeInorderSteps(input = {}) {
  const steps = [];
  const nodes = [4, 2, 5, 1, 3]; // Flattened example
  const traversalOrder = [];

  steps.push({
    stepIndex: 0,
    operation: "pointer_move",
    pseudocodeLine: 1,
    explanation: `Begin recursive Inorder Traversal (Left Subtree -> Root Node -> Right Subtree).`,
    state: { array: [1, 2, 3, 4, 5], variables: { order: [] } }
  });

  const sequence = [
    { node: 4, exp: "Traverse left to deepest leaf node 4." },
    { node: 2, exp: "Visit parent node 2 after left child 4." },
    { node: 5, exp: "Traverse to right child 5 of node 2." },
    { node: 1, exp: "Visit root node 1 after entire left subtree [4, 2, 5] is traversed." },
    { node: 3, exp: "Traverse right child node 3." }
  ];

  for (const item of sequence) {
    traversalOrder.push(item.node);
    steps.push({
      stepIndex: steps.length,
      operation: "node_visit",
      pseudocodeLine: 4,
      explanation: item.exp,
      state: { array: [...traversalOrder], activeIndices: [traversalOrder.length - 1], variables: { visited: item.node, orderSoFar: [...traversalOrder] } }
    });
  }

  steps.push({
    stepIndex: steps.length,
    operation: "complete",
    pseudocodeLine: 6,
    explanation: `Inorder traversal complete. Final output sequence: [${traversalOrder.join(", ")}].`,
    state: { array: [...traversalOrder], highlighted: traversalOrder.map((_, i) => i) }
  });

  return {
    algorithmId: "tree-inorder-traversal",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: traversalOrder
  };
}

/**
 * 17. Binary Tree Level Order Traversal (BFS)
 */
function generateTreeLevelOrderSteps(input = {}) {
  const steps = [];
  const levels = [[3], [9, 20], [15, 7]];
  const queue = ["3"];
  const visited = [];

  steps.push({
    stepIndex: 0,
    operation: "queue_enqueue",
    pseudocodeLine: 1,
    explanation: `Initialize BFS queue with root node 3.`,
    state: { queue: [...queue], array: [] }
  });

  const sequence = [
    { level: 1, current: 3, children: [9, 20], exp: "Dequeue 3 at Level 1. Enqueue children 9 and 20." },
    { level: 2, current: 9, children: [], exp: "Dequeue 9 at Level 2. No children to enqueue." },
    { level: 2, current: 20, children: [15, 7], exp: "Dequeue 20 at Level 2. Enqueue children 15 and 7." },
    { level: 3, current: 15, children: [], exp: "Dequeue 15 at Level 3. Leaf node." },
    { level: 3, current: 7, children: [], exp: "Dequeue 7 at Level 3. Leaf node." }
  ];

  for (const item of sequence) {
    visited.push(item.current);
    steps.push({
      stepIndex: steps.length,
      operation: "node_visit",
      pseudocodeLine: 5,
      explanation: item.exp,
      state: { array: [...visited], variables: { current: item.current, level: item.level } }
    });
  }

  steps.push({
    stepIndex: steps.length,
    operation: "complete",
    pseudocodeLine: 8,
    explanation: `Level order traversal complete! Grouped by levels: ${JSON.stringify(levels)}.`,
    state: { array: visited, variables: { levels } }
  });

  return {
    algorithmId: "tree-level-order",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: levels
  };
}

/**
 * 18. Graph Breadth-First Search (BFS)
 */
function generateGraphBfsSteps(input = {}) {
  const graph = input.graph || {
    0: [1, 2],
    1: [0, 3, 4],
    2: [0, 5],
    3: [1],
    4: [1, 5],
    5: [2, 4]
  };
  const start = input.startNode !== undefined ? String(input.startNode) : "0";
  const steps = [];

  const visited = new Set([start]);
  const queue = [start];
  const traversalOrder = [];

  steps.push({
    stepIndex: 0,
    operation: "queue_enqueue",
    pseudocodeLine: 1,
    explanation: `Initialize Graph BFS from start node ${start}. Mark node ${start} as visited and enqueue it.`,
    state: { queue: [...queue], array: [start], variables: { visited: Array.from(visited) } }
  });

  while (queue.length > 0) {
    const node = queue.shift();
    traversalOrder.push(node);

    steps.push({
      stepIndex: steps.length,
      operation: "node_visit",
      pseudocodeLine: 4,
      explanation: `Dequeue node ${node}. Visit node and inspect all unvisited neighbors.`,
      state: { queue: [...queue], array: [...traversalOrder], activeIndices: [traversalOrder.length - 1], variables: { currentNode: node } }
    });

    const neighbors = graph[node] || [];
    for (const neighbor of neighbors) {
      const neighborStr = String(neighbor);
      if (!visited.has(neighborStr)) {
        visited.add(neighborStr);
        queue.push(neighborStr);

        steps.push({
          stepIndex: steps.length,
          operation: "queue_enqueue",
          pseudocodeLine: 7,
          explanation: `Discovered unvisited neighbor ${neighborStr} of node ${node}. Mark visited and enqueue ${neighborStr}.`,
          state: { queue: [...queue], array: [...traversalOrder], variables: { neighbor: neighborStr, visited: Array.from(visited) } }
        });
      }
    }
  }

  steps.push({
    stepIndex: steps.length,
    operation: "complete",
    pseudocodeLine: 10,
    explanation: `Graph BFS traversal complete! Traversal order: [${traversalOrder.join(" -> ")}].`,
    state: { array: [...traversalOrder], highlighted: traversalOrder.map((_, i) => i) }
  });

  return {
    algorithmId: "graph-bfs",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: traversalOrder
  };
}

/**
 * 19. Graph Depth-First Search (DFS)
 */
function generateGraphDfsSteps(input = {}) {
  const graph = input.graph || {
    0: [1, 2],
    1: [3, 4],
    2: [5],
    3: [],
    4: [],
    5: []
  };
  const start = input.startNode !== undefined ? String(input.startNode) : "0";
  const steps = [];
  const visited = new Set();
  const traversalOrder = [];

  steps.push({
    stepIndex: 0,
    operation: "pointer_move",
    pseudocodeLine: 1,
    explanation: `Begin Graph DFS starting from node ${start}. DFS explores as deeply as possible along each branch before backtracking.`,
    state: { array: [], stack: [start], variables: { start } }
  });

  function dfs(u) {
    visited.add(u);
    traversalOrder.push(u);

    steps.push({
      stepIndex: steps.length,
      operation: "node_visit",
      pseudocodeLine: 3,
      explanation: `Visit node ${u}. Add to DFS traversal path.`,
      state: { array: [...traversalOrder], activeIndices: [traversalOrder.length - 1], variables: { visitedNode: u } }
    });

    const neighbors = graph[u] || [];
    for (const v of neighbors) {
      const vStr = String(v);
      if (!visited.has(vStr)) {
        steps.push({
          stepIndex: steps.length,
          operation: "pointer_move",
          pseudocodeLine: 5,
          explanation: `Traverse edge (${u} -> ${vStr}): explore neighbor ${vStr}.`,
          state: { array: [...traversalOrder], variables: { from: u, to: vStr } }
        });
        dfs(vStr);
      }
    }
  }

  dfs(start);

  steps.push({
    stepIndex: steps.length,
    operation: "complete",
    pseudocodeLine: 8,
    explanation: `DFS exploration complete! Output path: [${traversalOrder.join(" -> ")}].`,
    state: { array: [...traversalOrder], highlighted: traversalOrder.map((_, i) => i) }
  });

  return {
    algorithmId: "graph-dfs",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: traversalOrder
  };
}

/**
 * 20. Dynamic Programming (Climbing Stairs)
 */
function generateDpClimbingStairsSteps(input = {}) {
  const n = input.n !== undefined ? Math.min(15, Math.max(1, Number(input.n))) : 5;
  const steps = [];

  const dp = new Array(n + 1).fill(0);
  dp[0] = 1;
  dp[1] = 1;

  steps.push({
    stepIndex: 0,
    operation: "table_update",
    pseudocodeLine: 1,
    explanation: `Define DP table: dp[i] represents number of distinct ways to climb i steps. Target n = ${n}.`,
    state: { dpTable: [1, 1], variables: { n } }
  });

  steps.push({
    stepIndex: steps.length,
    operation: "table_update",
    pseudocodeLine: 3,
    explanation: `Base cases: dp[0] = 1 (1 way to stay at ground), dp[1] = 1 (1 single-step).`,
    state: { dpTable: [1, 1], activeIndices: [0, 1], variables: { "dp[0]": 1, "dp[1]": 1 } }
  });

  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
    steps.push({
      stepIndex: steps.length,
      operation: "table_update",
      pseudocodeLine: 5,
      explanation: `Recurrence: dp[${i}] = dp[${i - 1}] (${dp[i - 1]}) + dp[${i - 2}] (${dp[i - 2]}) = ${dp[i]}. (Arriving via 1-step or 2-step jump).`,
      state: { dpTable: [...dp.slice(0, i + 1)], activeIndices: [i], pointers: { "i-2": i - 2, "i-1": i - 1, i }, variables: { i, "dp[i]": dp[i] } }
    });
  }

  steps.push({
    stepIndex: steps.length,
    operation: "complete",
    pseudocodeLine: 7,
    explanation: `DP calculation complete! Total distinct ways to climb ${n} stairs is dp[${n}] = ${dp[n]}.`,
    state: { dpTable: [...dp], highlighted: [n], variables: { result: dp[n] } }
  });

  return {
    algorithmId: "dp-climbing-stairs",
    steps: steps.map((s, idx) => ({ ...s, stepIndex: idx, totalSteps: steps.length })),
    result: dp[n]
  };
}

/**
 * Complete Algorithm Registry mapping IDs to metadata and step generators
 */
const ALGORITHM_REGISTRY = {
  "binary-search": {
    id: "binary-search",
    title: "Binary Search",
    category: "Searching",
    difficulty: "Easy",
    timeComplexity: { best: "O(1)", average: "O(log N)", worst: "O(log N)" },
    spaceComplexity: "O(1)",
    description: "Search a sorted collection by repeatedly dividing the search interval in half.",
    whenToUse: "The input array is sorted, or a monotonic condition function exists over an answer space.",
    coreIntuition: "Compare the target with the middle element to discard half of the remaining candidates in O(1) time.",
    observations: [
      "Requires sorted order or monotonic decision function.",
      "mid = low + Math.floor((high - low) / 2) safely prevents integer overflow.",
      "Time complexity decreases exponentially with each halving operation."
    ],
    pseudocode: `function binarySearch(arr, target):
  low = 0, high = arr.length - 1
  while low <= high:
    mid = low + floor((high - low) / 2)
    if arr[mid] == target:
      return mid
    else if arr[mid] < target:
      low = mid + 1
    else:
      high = mid - 1
  return -1`,
    defaultInput: { array: [1, 3, 5, 7, 9, 11, 13, 15], target: 7 },
    generator: generateBinarySearchSteps
  },

  "linear-search": {
    id: "linear-search",
    title: "Linear Search",
    category: "Searching",
    difficulty: "Easy",
    timeComplexity: { best: "O(1)", average: "O(N)", worst: "O(N)" },
    spaceComplexity: "O(1)",
    description: "Sequential search checking every element from left to right until the target is found.",
    whenToUse: "The array is unsorted and no indexing or hashing data structures exist.",
    coreIntuition: "Examine each item in sequence until a match is found or the end is reached.",
    observations: [
      "Works on any collection regardless of ordering.",
      "Best case O(1) when target is at the first index; worst case O(N) when absent."
    ],
    pseudocode: `function linearSearch(arr, target):
  for i from 0 to arr.length - 1:
    if arr[i] == target:
      return i
  return -1`,
    defaultInput: { array: [14, 9, 27, 4, 18, 42, 6], target: 18 },
    generator: generateLinearSearchSteps
  },

  "bubble-sort": {
    id: "bubble-sort",
    title: "Bubble Sort",
    category: "Sorting",
    difficulty: "Easy",
    timeComplexity: { best: "O(N)", average: "O(N^2)", worst: "O(N^2)" },
    spaceComplexity: "O(1)",
    description: "Repeatedly swaps adjacent elements that are in the wrong order.",
    whenToUse: "Educational introduction to sorting; small datasets.",
    coreIntuition: "Heavier elements 'bubble up' to the end of the array on each pass.",
    observations: [
      "Stable sorting algorithm.",
      "Can terminate early if a pass makes 0 swaps."
    ],
    pseudocode: `function bubbleSort(arr):
  for i from 0 to n - 2:
    for j from 0 to n - i - 2:
      if arr[j] > arr[j + 1]:
        swap(arr[j], arr[j + 1])
  return arr`,
    defaultInput: { array: [5, 1, 4, 2, 8] },
    generator: generateBubbleSortSteps
  },

  "selection-sort": {
    id: "selection-sort",
    title: "Selection Sort",
    category: "Sorting",
    difficulty: "Easy",
    timeComplexity: { best: "O(N^2)", average: "O(N^2)", worst: "O(N^2)" },
    spaceComplexity: "O(1)",
    description: "Finds the minimum element from the unsorted section and puts it at the beginning.",
    whenToUse: "Memory writes are expensive (minimizes total swaps to at most N).",
    coreIntuition: "Divide array into sorted prefix and unsorted suffix; select minimum of suffix.",
    observations: [
      "Performs at most N swaps.",
      "Unstable in standard array implementation."
    ],
    pseudocode: `function selectionSort(arr):
  for i from 0 to n - 2:
    minIdx = i
    for j from i + 1 to n - 1:
      if arr[j] < arr[minIdx]:
        minIdx = j
    swap(arr[i], arr[minIdx])
  return arr`,
    defaultInput: { array: [64, 25, 12, 22, 11] },
    generator: generateSelectionSortSteps
  },

  "insertion-sort": {
    id: "insertion-sort",
    title: "Insertion Sort",
    category: "Sorting",
    difficulty: "Easy",
    timeComplexity: { best: "O(N)", average: "O(N^2)", worst: "O(N^2)" },
    spaceComplexity: "O(1)",
    description: "Builds the final sorted array one item at a time by inserting each element into place.",
    whenToUse: "Array is already partially sorted or data arrives in a continuous stream.",
    coreIntuition: "Like sorting playing cards in hand: shift larger cards right to make room.",
    observations: [
      "Very fast O(N) when array is nearly sorted.",
      "Stable and in-place."
    ],
    pseudocode: `function insertionSort(arr):
  for i from 1 to n - 1:
    key = arr[i], j = i - 1
    while j >= 0 and arr[j] > key:
      arr[j + 1] = arr[j]
      j = j - 1
    arr[j + 1] = key
  return arr`,
    defaultInput: { array: [12, 11, 13, 5, 6] },
    generator: generateInsertionSortSteps
  },

  "merge-sort": {
    id: "merge-sort",
    title: "Merge Sort",
    category: "Sorting",
    difficulty: "Medium",
    timeComplexity: { best: "O(N log N)", average: "O(N log N)", worst: "O(N log N)" },
    spaceComplexity: "O(N)",
    description: "Divide and conquer sorting algorithm that recursively divides the array and merges sorted halves.",
    whenToUse: "Guaranteed O(N log N) performance and stability are required.",
    coreIntuition: "Two sorted sub-lists can be merged into a single sorted list in linear time.",
    observations: [
      "Guaranteed O(N log N) worst-case time complexity.",
      "Requires O(N) auxiliary memory."
    ],
    pseudocode: `function mergeSort(arr):
  if arr.length <= 1: return arr
  mid = floor(arr.length / 2)
  left = mergeSort(arr[0..mid])
  right = mergeSort(arr[mid..end])
  return merge(left, right)`,
    defaultInput: { array: [38, 27, 43, 3, 9, 82, 10] },
    generator: generateMergeSortSteps
  },

  "quick-sort": {
    id: "quick-sort",
    title: "Quick Sort",
    category: "Sorting",
    difficulty: "Medium",
    timeComplexity: { best: "O(N log N)", average: "O(N log N)", worst: "O(N^2)" },
    spaceComplexity: "O(log N)",
    description: "Picks a pivot and partitions the array around it such that smaller items are left and larger are right.",
    whenToUse: "General-purpose in-place sorting with excellent cache locality.",
    coreIntuition: "Once an element is partitioned, it is in its final sorted position.",
    observations: [
      "In-place sorting with low memory overhead.",
      "Worst case O(N^2) avoided by randomized pivot selection."
    ],
    pseudocode: `function quickSort(arr, low, high):
  if low < high:
    pivotIndex = partition(arr, low, high)
    quickSort(arr, low, pivotIndex - 1)
    quickSort(arr, pivotIndex + 1, high)`,
    defaultInput: { array: [10, 80, 30, 90, 40, 50, 70] },
    generator: generateQuickSortSteps
  },

  "two-sum": {
    id: "two-sum",
    title: "Two Sum (Hash Map)",
    category: "Hashing",
    difficulty: "Easy",
    timeComplexity: { best: "O(N)", average: "O(N)", worst: "O(N)" },
    spaceComplexity: "O(N)",
    description: "Finds two indices such that their elements sum up to a specific target using an auxiliary hash table.",
    whenToUse: "Finding pair relationships or complements in single-pass linear time.",
    coreIntuition: "For any number x, check if (target - x) was already seen in the map.",
    observations: [
      "Trades O(N) auxiliary space for O(N) time efficiency.",
      "Eliminates the O(N^2) quadratic nested loop."
    ],
    pseudocode: `function twoSum(nums, target):
  seen = {}
  for i from 0 to nums.length - 1:
    complement = target - nums[i]
    if complement in seen:
      return [seen[complement], i]
    seen[nums[i]] = i
  return []`,
    defaultInput: { array: [2, 7, 11, 15], target: 9 },
    generator: generateTwoSumSteps
  },

  "two-pointers": {
    id: "two-pointers",
    title: "Two Pointers (Target Sum)",
    category: "Two Pointers",
    difficulty: "Easy",
    timeComplexity: { best: "O(N)", average: "O(N)", worst: "O(N)" },
    spaceComplexity: "O(1)",
    description: "Uses left and right boundaries converging inward on a sorted sequence.",
    whenToUse: "Sorted sequence searching for pairs, palindromes, or container volumes.",
    coreIntuition: "If sum < target, advance left to increase; if sum > target, decrement right to decrease.",
    observations: [
      "Requires sorted array.",
      "Achieves O(1) auxiliary space."
    ],
    pseudocode: `function twoPointers(arr, target):
  left = 0, right = arr.length - 1
  while left < right:
    sum = arr[left] + arr[right]
    if sum == target: return [left, right]
    else if sum < target: left++
    else: right--
  return []`,
    defaultInput: { array: [1, 2, 4, 6, 8, 11, 15], target: 10 },
    generator: generateTwoPointersSteps
  },

  "sliding-window": {
    id: "sliding-window",
    title: "Sliding Window (Max Subarray Sum K)",
    category: "Sliding Window",
    difficulty: "Medium",
    timeComplexity: { best: "O(N)", average: "O(N)", worst: "O(N)" },
    spaceComplexity: "O(1)",
    description: "Maintains a contiguous window over elements, adding the entering item and removing the leaving item.",
    whenToUse: "Finding optimal contiguous subarray/substring aggregates (sum, length, frequency).",
    coreIntuition: "Avoid recomputing sum from scratch: newSum = oldSum - leftElement + rightElement.",
    observations: [
      "Converts O(N * K) brute force into clean O(N) single pass.",
      "Reuses overlap between adjacent windows."
    ],
    pseudocode: `function maxSubarraySum(arr, k):
  windowSum = sum(arr[0..k-1])
  maxSum = windowSum
  for i from k to arr.length - 1:
    windowSum += arr[i] - arr[i - k]
    maxSum = max(maxSum, windowSum)
  return maxSum`,
    defaultInput: { array: [2, 1, 5, 1, 3, 2], k: 3 },
    generator: generateSlidingWindowSteps
  },

  "prefix-sum": {
    id: "prefix-sum",
    title: "Prefix Sum (Range Sum Queries)",
    category: "Prefix Sum",
    difficulty: "Easy",
    timeComplexity: { best: "O(1) query, O(N) prep", average: "O(1) query", worst: "O(1) query" },
    spaceComplexity: "O(N)",
    description: "Precomputes cumulative sums to answer arbitrary range sum queries in O(1) constant time.",
    whenToUse: "Frequent range sum or subarray balance queries.",
    coreIntuition: "sum(L..R) = prefix[R + 1] - prefix[L].",
    observations: [
      "1-indexed prefix arrays eliminate boundary edge-case checks for index 0.",
      "Precomputing takes O(N) time; all subsequent queries are O(1)."
    ],
    pseudocode: `function prefixSum(arr, left, right):
  prefix = buildPrefixArray(arr)
  return prefix[right + 1] - prefix[left]`,
    defaultInput: { array: [3, 1, 4, 1, 5, 9, 2], query: { left: 2, right: 5 } },
    generator: generatePrefixSumSteps
  },

  "stack-operations": {
    id: "stack-operations",
    title: "Stack (Push / Pop / Peek)",
    category: "Stacks",
    difficulty: "Easy",
    timeComplexity: { best: "O(1)", average: "O(1)", worst: "O(1)" },
    spaceComplexity: "O(N)",
    description: "Visualizes the Last-In, First-Out (LIFO) stack data structure.",
    whenToUse: "Bracket matching, backtracking, expression evaluation, monotonic stacks.",
    coreIntuition: "The last element added is the first one to be removed.",
    observations: [
      "All primary operations (push, pop, peek) operate in O(1) time.",
      "Underpins function call stacks and depth-first searches."
    ],
    pseudocode: `stack = []
push(x): stack.append(x)
pop(): return stack.removeLast()
peek(): return stack[top]`,
    defaultInput: { operations: [{ type: "push", value: 10 }, { type: "push", value: 20 }, { type: "peek" }, { type: "push", value: 30 }, { type: "pop" }, { type: "push", value: 40 }] },
    generator: generateStackSteps
  },

  "queue-operations": {
    id: "queue-operations",
    title: "Queue (Enqueue / Dequeue)",
    category: "Queues",
    difficulty: "Easy",
    timeComplexity: { best: "O(1)", average: "O(1)", worst: "O(1)" },
    spaceComplexity: "O(N)",
    description: "Visualizes the First-In, First-Out (FIFO) queue data structure.",
    whenToUse: "Breadth-first search, job scheduling, buffer management.",
    coreIntuition: "Items are serviced in the order they arrived.",
    observations: [
      "Elements enter at the rear and leave at the front.",
      "Essential for level-order traversals and unweighted shortest path."
    ],
    pseudocode: `queue = []
enqueue(x): queue.append(x)
dequeue(): return queue.removeFirst()`,
    defaultInput: { operations: [{ type: "enqueue", value: "A" }, { type: "enqueue", value: "B" }, { type: "enqueue", value: "C" }, { type: "dequeue" }, { type: "enqueue", value: "D" }] },
    generator: generateQueueSteps
  },

  "linked-list-traversal": {
    id: "linked-list-traversal",
    title: "Linked List Traversal",
    category: "Linked Lists",
    difficulty: "Easy",
    timeComplexity: { best: "O(1)", average: "O(N)", worst: "O(N)" },
    spaceComplexity: "O(1)",
    description: "Iterates through singly linked list nodes following next pointers until null.",
    whenToUse: "Processing sequential, dynamically allocated node chains.",
    coreIntuition: "Follow curr = curr.next until reaching the null terminal pointer.",
    observations: [
      "No random access (unlike arrays); indexing is O(N).",
      "Dynamic allocation allows O(1) insertions once a node pointer is held."
    ],
    pseudocode: `curr = head
while curr != null:
  process(curr.value)
  curr = curr.next`,
    defaultInput: { nodes: [10, 20, 30, 40, 50] },
    generator: generateLinkedListTraversalSteps
  },

  "reverse-linked-list": {
    id: "reverse-linked-list",
    title: "Reverse Linked List",
    category: "Linked Lists",
    difficulty: "Easy",
    timeComplexity: { best: "O(N)", average: "O(N)", worst: "O(N)" },
    spaceComplexity: "O(1)",
    description: "Inverts the direction of next pointers in a singly linked list in a single pass.",
    whenToUse: "Reordering lists, palindrome verification, reordering sublists.",
    coreIntuition: "Use three pointers (prev, curr, nextNode) to reverse arrows without losing references.",
    observations: [
      "Must save curr.next before overwriting curr.next = prev.",
      "After the loop, prev points to the new head of the reversed list."
    ],
    pseudocode: `prev = null, curr = head
while curr != null:
  nextNode = curr.next
  curr.next = prev
  prev = curr
  curr = nextNode
return prev`,
    defaultInput: { nodes: [1, 2, 3, 4, 5] },
    generator: generateReverseLinkedListSteps
  },

  "tree-inorder-traversal": {
    id: "tree-inorder-traversal",
    title: "Binary Tree Inorder Traversal",
    category: "Trees",
    difficulty: "Easy",
    timeComplexity: { best: "O(N)", average: "O(N)", worst: "O(N)" },
    spaceComplexity: "O(H) where H is tree height",
    description: "Depth-first tree traversal visiting Left Subtree -> Node -> Right Subtree.",
    whenToUse: "Extracting sorted order from Binary Search Trees (BSTs).",
    coreIntuition: "Recursively process left children first, visit the node, then process right children.",
    observations: [
      "In a BST, Inorder traversal visits keys in ascending sorted order.",
      "Auxiliary space is bounded by tree height O(H)."
    ],
    pseudocode: `function inorder(root):
  if root == null: return
  inorder(root.left)
  visit(root.val)
  inorder(root.right)`,
    defaultInput: { nodes: [1, 2, 3, 4, 5] },
    generator: generateTreeInorderSteps
  },

  "tree-level-order": {
    id: "tree-level-order",
    title: "Binary Tree Level Order Traversal",
    category: "Trees",
    difficulty: "Medium",
    timeComplexity: { best: "O(N)", average: "O(N)", worst: "O(N)" },
    spaceComplexity: "O(W) where W is max tree width",
    description: "Breadth-first search traversing binary tree nodes level by level from root to leaves.",
    whenToUse: "Finding level groupings, shortest path in tree, or view projections.",
    coreIntuition: "Use a FIFO queue to process current level nodes while enqueueing next level children.",
    observations: [
      "Guarantees that nodes at depth d are visited before depth d + 1.",
      "Queue size peaks at the maximum level width (up to N/2 for full binary tree)."
    ],
    pseudocode: `queue = [root]
while queue is not empty:
  node = queue.popFront()
  visit(node)
  if node.left: queue.push(node.left)
  if node.right: queue.push(node.right)`,
    defaultInput: { nodes: [3, 9, 20, 15, 7] },
    generator: generateTreeLevelOrderSteps
  },

  "graph-bfs": {
    id: "graph-bfs",
    title: "Graph Breadth-First Search (BFS)",
    category: "Graphs",
    difficulty: "Medium",
    timeComplexity: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)" },
    spaceComplexity: "O(V)",
    description: "Traverses graph outward in concentric layers using a queue and visited set.",
    whenToUse: "Finding shortest path in unweighted graphs, connected components, level-distance.",
    coreIntuition: "Visit all immediate neighbors of distance 1 before moving to distance 2.",
    observations: [
      "Visited set prevents infinite cycles in cyclic graphs.",
      "Finds shortest hop-count path in unweighted graphs."
    ],
    pseudocode: `queue = [start], visited = {start}
while queue is not empty:
  u = queue.popFront()
  for neighbor v in graph[u]:
    if v not in visited:
      visited.add(v)
      queue.push(v)`,
    defaultInput: { startNode: "0" },
    generator: generateGraphBfsSteps
  },

  "graph-dfs": {
    id: "graph-dfs",
    title: "Graph Depth-First Search (DFS)",
    category: "Graphs",
    difficulty: "Medium",
    timeComplexity: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)" },
    spaceComplexity: "O(V)",
    description: "Explores as deeply as possible along each branch before backtracking.",
    whenToUse: "Topological sorting, cycle detection, pathfinding, connected components.",
    coreIntuition: "Follow an edge path to its dead end, then backtrack to the most recent unvisited branch.",
    observations: [
      "Uses recursion stack or explicit LIFO stack.",
      "Detects back-edges to identify cycles."
    ],
    pseudocode: `visited = {}
function dfs(u):
  visited.add(u)
  for neighbor v in graph[u]:
    if v not in visited:
      dfs(v)`,
    defaultInput: { startNode: "0" },
    generator: generateGraphDfsSteps
  },

  "dp-climbing-stairs": {
    id: "dp-climbing-stairs",
    title: "Dynamic Programming (Climbing Stairs)",
    category: "Dynamic Programming",
    difficulty: "Easy",
    timeComplexity: { best: "O(N)", average: "O(N)", worst: "O(N)" },
    spaceComplexity: "O(N) (or O(1) space optimized)",
    description: "Computes total distinct combinations to reach step N taking 1 or 2 steps using memoized subproblems.",
    whenToUse: "Overlapping subproblems with optimal substructure.",
    coreIntuition: "To reach step i, you must jump from step i-1 or step i-2. Therefore dp[i] = dp[i-1] + dp[i-2].",
    observations: [
      "Direct mathematical bijection to Fibonacci sequence.",
      "Reduces exponential O(2^N) recursion to linear O(N) by storing subproblem results."
    ],
    pseudocode: `dp = [1, 1]
for i from 2 to n:
  dp[i] = dp[i - 1] + dp[i - 2]
return dp[n]`,
    defaultInput: { n: 5 },
    generator: generateDpClimbingStairsSteps
  }
};

/**
 * Retrieves list of all registered algorithms with public summary metadata.
 */
const ALGORITHM_ALIASES = {
  "valid-parentheses": "stack-operations",
  "climbing-stairs": "dp-climbing-stairs",
  "coin-change": "dp-climbing-stairs",
  "bfs-graph": "graph-bfs",
  "dfs-graph": "graph-dfs",
  "queue-bfs": "queue-operations",
  "trapping-rain-water": "two-pointers",
  "two-pointers-palindrome": "two-pointers",
  "sliding-window-max": "sliding-window",
  "invert-binary-tree": "tree-level-order",
  "next-greater-element": "stack-operations"
};

function resolveAlgorithmKey(key) {
  if (!key) return null;
  if (ALGORITHM_REGISTRY[key]) return key;
  if (ALGORITHM_ALIASES[key] && ALGORITHM_REGISTRY[ALGORITHM_ALIASES[key]]) return ALGORITHM_ALIASES[key];
  const normalized = String(key).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (ALGORITHM_REGISTRY[normalized]) return normalized;
  if (ALGORITHM_ALIASES[normalized]) return ALGORITHM_ALIASES[normalized];
  for (const algo of Object.values(ALGORITHM_REGISTRY)) {
    if (algo.title.toLowerCase() === String(key).toLowerCase()) return algo.id;
  }
  return null;
}

/**
 * Returns all 20 registered algorithms with canonical metadata.
 */
function listRegisteredAlgorithms(categoryFilter = null) {
  const all = Object.values(ALGORITHM_REGISTRY).map(algo => ({
    id: algo.id,
    title: algo.title,
    name: algo.title,
    category: algo.category,
    difficulty: algo.difficulty,
    timeComplexity: typeof algo.timeComplexity === "object" ? algo.timeComplexity.average : algo.timeComplexity,
    timeComplexityDetails: algo.timeComplexity,
    spaceComplexity: algo.spaceComplexity,
    description: algo.description,
    whenToUse: algo.whenToUse,
    observations: algo.observations,
    pseudocode: typeof algo.pseudocode === "string" ? algo.pseudocode.split("\n") : (algo.pseudocode || []),
    defaultInput: algo.defaultInput
  }));

  if (categoryFilter && categoryFilter !== "all" && categoryFilter !== "ALL") {
    return all.filter(a => a.category.toLowerCase() === categoryFilter.toLowerCase());
  }
  return all;
}

/**
 * Retrieves full details and default generated steps for an algorithm.
 */
function getAlgorithmDetails(algorithmId) {
  const key = resolveAlgorithmKey(algorithmId);
  if (!key) return null;
  const algo = ALGORITHM_REGISTRY[key];
  if (!algo) return null;

  const defaultSteps = algo.generator(algo.defaultInput);

  // Normalize steps with top-level convenience accessors
  const normalizedSteps = (defaultSteps.steps || []).map(s => {
    const st = s.state || {};
    return {
      ...s,
      array: s.array || st.array,
      activeIndices: s.activeIndices || st.activeIndices || [],
      pointers: s.pointers || st.pointers || {},
      variables: s.variables || st.variables || {},
      hashTable: s.hashTable || st.hashTable,
      stack: s.stack || st.stack,
      queue: s.queue || st.queue,
      dpTable: s.dpTable || st.dpTable,
      sorted: s.sorted || st.sorted || [],
      found: s.found || st.found || [],
      comparing: s.comparing || st.comparing || [],
      swapping: s.swapping || st.swapping || []
    };
  });

  return {
    id: algo.id,
    title: algo.title,
    name: algo.title,
    category: algo.category,
    difficulty: algo.difficulty,
    timeComplexity: typeof algo.timeComplexity === "object" ? algo.timeComplexity.average : algo.timeComplexity,
    timeComplexityDetails: algo.timeComplexity,
    spaceComplexity: algo.spaceComplexity,
    description: algo.description,
    whenToUse: algo.whenToUse,
    coreIntuition: algo.coreIntuition,
    observations: algo.observations,
    pseudocode: typeof algo.pseudocode === "string" ? algo.pseudocode.split("\n") : (algo.pseudocode || []),
    defaultInput: algo.defaultInput,
    steps: normalizedSteps,
    totalSteps: normalizedSteps.length,
    result: defaultSteps.result
  };
}

/**
 * Generates visualization steps for an algorithm with custom inputs.
 */
function generateAlgorithmSteps(algorithmId, customInput = {}) {
  const key = resolveAlgorithmKey(algorithmId);
  if (!key) {
    throw new Error(`Algorithm '${algorithmId}' is not registered in the visualizer engine.`);
  }
  const algo = ALGORITHM_REGISTRY[key];

  let inputToUse = algo.defaultInput;
  if (customInput && typeof customInput === "object" && Object.keys(customInput).length > 0) {
    // Merge or wrap array
    if (Array.isArray(customInput.arr) || Array.isArray(customInput.array)) {
      inputToUse = {
        ...algo.defaultInput,
        ...customInput,
        arr: customInput.arr || customInput.array,
        array: customInput.arr || customInput.array
      };
    } else {
      inputToUse = { ...algo.defaultInput, ...customInput };
    }
  }

  const execution = algo.generator(inputToUse);

  const normalizedSteps = (execution.steps || []).map((s, idx) => {
    const st = s.state || {};
    return {
      ...s,
      stepIndex: idx,
      totalSteps: execution.steps.length,
      array: s.array || st.array,
      activeIndices: s.activeIndices || st.activeIndices || [],
      pointers: s.pointers || st.pointers || {},
      variables: s.variables || st.variables || {},
      hashTable: s.hashTable || st.hashTable,
      stack: s.stack || st.stack,
      queue: s.queue || st.queue,
      dpTable: s.dpTable || st.dpTable,
      sorted: s.sorted || st.sorted || [],
      found: s.found || st.found || [],
      comparing: s.comparing || st.comparing || [],
      swapping: s.swapping || st.swapping || []
    };
  });

  return {
    algorithmId: algo.id,
    title: algo.title,
    name: algo.title,
    category: algo.category,
    initialInput: inputToUse,
    input: inputToUse,
    steps: normalizedSteps,
    totalSteps: normalizedSteps.length,
    result: execution.result,
    complexity: {
      time: typeof algo.timeComplexity === "object" ? algo.timeComplexity.average : algo.timeComplexity,
      space: algo.spaceComplexity
    }
  };
}

/**
 * Side-by-side comparison between two algorithms.
 */
function compareAlgorithms(algoId1, algoId2) {
  const k1 = resolveAlgorithmKey(algoId1);
  const k2 = resolveAlgorithmKey(algoId2);
  const a1 = ALGORITHM_REGISTRY[k1];
  const a2 = ALGORITHM_REGISTRY[k2];

  if (!a1 || !a2) {
    throw new Error(`One or both algorithms ('${algoId1}', '${algoId2}') not found for comparison.`);
  }

  const compData1 = {
    id: a1.id,
    title: a1.title,
    name: a1.title,
    category: a1.category,
    timeComplexity: typeof a1.timeComplexity === "object" ? a1.timeComplexity.average : a1.timeComplexity,
    timeComplexityDetails: a1.timeComplexity,
    spaceComplexity: a1.spaceComplexity,
    coreIntuition: a1.coreIntuition,
    whenToUse: a1.whenToUse,
    observations: a1.observations,
    inPlace: a1.spaceComplexity === "O(1)",
    stable: Boolean(a1.observations && a1.observations.some(o => o.toLowerCase().includes("stable"))),
    bestUseCase: a1.whenToUse,
    tradeoffs: a1.observations ? a1.observations.join("; ") : ""
  };

  const compData2 = {
    id: a2.id,
    title: a2.title,
    name: a2.title,
    category: a2.category,
    timeComplexity: typeof a2.timeComplexity === "object" ? a2.timeComplexity.average : a2.timeComplexity,
    timeComplexityDetails: a2.timeComplexity,
    spaceComplexity: a2.spaceComplexity,
    coreIntuition: a2.coreIntuition,
    whenToUse: a2.whenToUse,
    observations: a2.observations,
    inPlace: a2.spaceComplexity === "O(1)",
    stable: Boolean(a2.observations && a2.observations.some(o => o.toLowerCase().includes("stable"))),
    bestUseCase: a2.whenToUse,
    tradeoffs: a2.observations ? a2.observations.join("; ") : ""
  };

  const a1TimeAvg = typeof a1.timeComplexity === "object" ? a1.timeComplexity.average : a1.timeComplexity;
  const a2TimeAvg = typeof a2.timeComplexity === "object" ? a2.timeComplexity.average : a2.timeComplexity;
  const a1TimeBest = typeof a1.timeComplexity === "object" ? a1.timeComplexity.best : a1.timeComplexity;
  const a2TimeBest = typeof a2.timeComplexity === "object" ? a2.timeComplexity.best : a2.timeComplexity;

  return {
    algorithm1: compData1,
    algorithm2: compData2,
    algo1: compData1,
    algo2: compData2,
    timeComparison: {
      best: `${a1.title}: ${a1TimeBest} vs ${a2.title}: ${a2TimeBest}`,
      average: `${a1.title}: ${a1TimeAvg} vs ${a2.title}: ${a2TimeAvg}`
    },
    spaceComparison: {
      algo1: a1.spaceComplexity,
      algo2: a2.spaceComplexity
    },
    comparisonSummary: {
      timeTradeoff: `${a1.title} (${a1TimeAvg}) vs ${a2.title} (${a2TimeAvg})`,
      spaceTradeoff: `${a1.title} (${a1.spaceComplexity}) vs ${a2.title} (${a2.spaceComplexity})`,
      recommendedChoice: `Use ${a1.title} when ${a1.whenToUse}; prefer ${a2.title} when ${a2.whenToUse}.`
    },
    recommendation: `Use ${a1.title} when ${a1.whenToUse}; prefer ${a2.title} when ${a2.whenToUse}.`
  };
}

/**
 * Validates AI-generated visualization steps against a strict schema.
 */
function validateAiVisualizationSteps(payload) {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Payload must be a non-null object." };
  }

  const steps = payload.steps;
  if (!Array.isArray(steps) || steps.length === 0) {
    return { valid: false, error: "Payload must contain a non-empty 'steps' array." };
  }

  if (steps.length > 40) {
    return { valid: false, error: "Step count exceeds maximum limit of 40 steps for interactive stability." };
  }

  const allowedOperations = new Set([
    "compare",
    "swap",
    "pointer_move",
    "hash_lookup",
    "hash_insert",
    "stack_push",
    "stack_pop",
    "queue_enqueue",
    "queue_dequeue",
    "table_update",
    "node_visit",
    "complete",
    "init",
    "step",
    "found",
    "lookup"
  ]);

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (typeof s !== "object" || s === null) {
      return { valid: false, error: `Step at index ${i} is not a valid object.` };
    }
    if (s.operation && !allowedOperations.has(s.operation)) {
      return { valid: false, error: `Step at index ${i} has invalid operation '${s.operation}'.` };
    }
    if (!s.explanation && !s.narrative) {
      return { valid: false, error: `Step at index ${i} must have an explanation string.` };
    }
  }

  return { valid: true, steps };
}

/**
 * Generates dry run code line trace with variable snapshots.
 */
function generateDryRunTrace(algorithmId, customInput = {}) {
  const key = resolveAlgorithmKey(algorithmId);
  if (!key) {
    throw new Error(`Algorithm '${algorithmId}' is not supported for dry-run tracing.`);
  }
  const algo = ALGORITHM_REGISTRY[key];

  const stepsResult = algo.generator(customInput && Object.keys(customInput).length > 0 ? customInput : algo.defaultInput);
  const codeLines = (typeof algo.pseudocode === "string" ? algo.pseudocode : "").split("\n");

  const traceSteps = stepsResult.steps.map((step, i) => ({
    stepIndex: i,
    totalSteps: stepsResult.steps.length,
    line: step.pseudocodeLine || 1,
    activeLineNumber: step.pseudocodeLine || 1,
    activeLineText: codeLines[(step.pseudocodeLine || 1) - 1] || "",
    variables: step.state?.variables || step.variables || {},
    explanation: step.explanation,
    operation: step.operation,
    conditionEval: step.state?.variables?.condition || (step.operation === "compare" ? "Condition evaluated: true" : "Executing next instruction."),
    stateSnapshot: step.state || {}
  }));

  return {
    algorithmId: algo.id,
    title: algo.title,
    name: algo.title,
    codeLines,
    traceSteps,
    steps: traceSteps,
    totalSteps: traceSteps.length
  };
}

module.exports = {
  ALGORITHM_CATEGORIES,
  ALGORITHM_REGISTRY,
  listRegisteredAlgorithms,
  getAlgorithmDetails,
  generateAlgorithmSteps,
  compareAlgorithms,
  validateAiVisualizationSteps,
  generateDryRunTrace,
  // Individual step generators
  generateBinarySearchSteps,
  generateLinearSearchSteps,
  generateBubbleSortSteps,
  generateSelectionSortSteps,
  generateInsertionSortSteps,
  generateMergeSortSteps,
  generateQuickSortSteps,
  generateTwoSumSteps,
  generateTwoPointersSteps,
  generateSlidingWindowSteps,
  generatePrefixSumSteps,
  generateStackSteps,
  generateQueueSteps,
  generateLinkedListTraversalSteps,
  generateReverseLinkedListSteps,
  generateTreeInorderSteps,
  generateTreeLevelOrderSteps,
  generateGraphBfsSteps,
  generateGraphDfsSteps,
  generateDpClimbingStairsSteps
};
