from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os
import subprocess
import json
import textwrap
import requests
from src.llm_engine import generate_code
from src.transcriber import transcribe_audio

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)

# Ensure recordings directory exists
if not os.path.exists("recordings"):
    os.makedirs("recordings")

# Global path to the generated script
SCRIPT_PATH = "generated_script.py"

# ─── Local Problem Bank (fallback when LeetCode is unreachable) ──────────────
PROBLEM_BANK = {
    "two-sum": {
        "id": 1, "slug": "two-sum", "title": "Two Sum", "difficulty": "Easy",
        "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
        "examples": [
            {"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."},
            {"input": "nums = [3,2,4], target = 6", "output": "[1,2]", "explanation": ""},
            {"input": "nums = [3,3], target = 6", "output": "[0,1]", "explanation": ""}
        ],
        "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9", "Only one valid answer exists."],
        "function_signature": "def twoSum(nums: list[int], target: int) -> list[int]:",
        "test_cases": [
            {"input": {"nums": [2,7,11,15], "target": 9}, "expected": [0,1]},
            {"input": {"nums": [3,2,4], "target": 6}, "expected": [1,2]},
            {"input": {"nums": [3,3], "target": 6}, "expected": [0,1]},
            {"input": {"nums": [1,5,3,7], "target": 8}, "expected": [1,2]},
        ]
    },
    "reverse-string": {
        "id": 344, "slug": "reverse-string", "title": "Reverse String", "difficulty": "Easy",
        "description": "Write a function that reverses a string. The input string is given as an array of characters `s`.\n\nYou must do this by modifying the input array in-place with O(1) extra memory.",
        "examples": [
            {"input": 's = ["h","e","l","l","o"]', "output": '["o","l","l","e","h"]', "explanation": ""},
            {"input": 's = ["H","a","n","n","a","h"]', "output": '["h","a","n","n","a","H"]', "explanation": ""}
        ],
        "constraints": ["1 <= s.length <= 10^5", "s[i] is a printable ascii character."],
        "function_signature": "def reverseString(s: list[str]) -> None:",
        "test_cases": [
            {"input": {"s": ["h","e","l","l","o"]}, "expected": ["o","l","l","e","h"]},
            {"input": {"s": ["H","a","n","n","a","h"]}, "expected": ["h","a","n","n","a","H"]},
        ]
    },
    "palindrome-number": {
        "id": 9, "slug": "palindrome-number", "title": "Palindrome Number", "difficulty": "Easy",
        "description": "Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.\n\nAn integer is a palindrome when it reads the same forward and backward.",
        "examples": [
            {"input": "x = 121", "output": "true", "explanation": "121 reads as 121 from left to right and from right to left."},
            {"input": "x = -121", "output": "false", "explanation": "From left to right, it reads -121. From right to left it becomes 121-."},
            {"input": "x = 10", "output": "false", "explanation": "Reads 01 from right to left."}
        ],
        "constraints": ["-2^31 <= x <= 2^31 - 1"],
        "function_signature": "def isPalindrome(x: int) -> bool:",
        "test_cases": [
            {"input": {"x": 121}, "expected": True},
            {"input": {"x": -121}, "expected": False},
            {"input": {"x": 10}, "expected": False},
            {"input": {"x": 0}, "expected": True},
        ]
    },
    "valid-parentheses": {
        "id": 20, "slug": "valid-parentheses", "title": "Valid Parentheses", "difficulty": "Easy",
        "description": "Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
        "examples": [
            {"input": 's = "()"', "output": "true", "explanation": ""},
            {"input": 's = "()[]{}"', "output": "true", "explanation": ""},
            {"input": 's = "(]"', "output": "false", "explanation": ""}
        ],
        "constraints": ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'."],
        "function_signature": "def isValid(s: str) -> bool:",
        "test_cases": [
            {"input": {"s": "()"}, "expected": True},
            {"input": {"s": "()[]{}"}, "expected": True},
            {"input": {"s": "(]"}, "expected": False},
            {"input": {"s": "({[]})"}, "expected": True},
        ]
    },
    "merge-two-sorted-lists": {
        "id": 21, "slug": "merge-two-sorted-lists", "title": "Merge Two Sorted Lists", "difficulty": "Easy",
        "description": "You are given the heads of two sorted linked lists `list1` and `list2`.\n\nMerge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn the head of the merged linked list.\n\n**For simplicity, use Python lists instead of linked list nodes.**",
        "examples": [
            {"input": "list1 = [1,2,4], list2 = [1,3,4]", "output": "[1,1,2,3,4,4]", "explanation": ""},
            {"input": "list1 = [], list2 = []", "output": "[]", "explanation": ""},
            {"input": "list1 = [], list2 = [0]", "output": "[0]", "explanation": ""}
        ],
        "constraints": ["The number of nodes in both lists is in the range [0, 50].", "-100 <= Node.val <= 100"],
        "function_signature": "def mergeTwoLists(list1: list[int], list2: list[int]) -> list[int]:",
        "test_cases": [
            {"input": {"list1": [1,2,4], "list2": [1,3,4]}, "expected": [1,1,2,3,4,4]},
            {"input": {"list1": [], "list2": []}, "expected": []},
            {"input": {"list1": [], "list2": [0]}, "expected": [0]},
        ]
    },
    "best-time-to-buy-and-sell-stock": {
        "id": 121, "slug": "best-time-to-buy-and-sell-stock", "title": "Best Time to Buy and Sell Stock", "difficulty": "Easy",
        "description": "You are given an array `prices` where `prices[i]` is the price of a given stock on the `ith` day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.",
        "examples": [
            {"input": "prices = [7,1,5,3,6,4]", "output": "5", "explanation": "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5."},
            {"input": "prices = [7,6,4,3,1]", "output": "0", "explanation": "No profitable transaction is possible."}
        ],
        "constraints": ["1 <= prices.length <= 10^5", "0 <= prices[i] <= 10^4"],
        "function_signature": "def maxProfit(prices: list[int]) -> int:",
        "test_cases": [
            {"input": {"prices": [7,1,5,3,6,4]}, "expected": 5},
            {"input": {"prices": [7,6,4,3,1]}, "expected": 0},
            {"input": {"prices": [2,4,1]}, "expected": 2},
        ]
    },
    "contains-duplicate": {
        "id": 217, "slug": "contains-duplicate", "title": "Contains Duplicate", "difficulty": "Easy",
        "description": "Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.",
        "examples": [
            {"input": "nums = [1,2,3,1]", "output": "true", "explanation": ""},
            {"input": "nums = [1,2,3,4]", "output": "false", "explanation": ""},
        ],
        "constraints": ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
        "function_signature": "def containsDuplicate(nums: list[int]) -> bool:",
        "test_cases": [
            {"input": {"nums": [1,2,3,1]}, "expected": True},
            {"input": {"nums": [1,2,3,4]}, "expected": False},
            {"input": {"nums": [1,1,1,3,3,4,3,2,4,2]}, "expected": True},
        ]
    },
    "maximum-subarray": {
        "id": 53, "slug": "maximum-subarray", "title": "Maximum Subarray", "difficulty": "Medium",
        "description": "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.",
        "examples": [
            {"input": "nums = [-2,1,-3,4,-1,2,1,-5,4]", "output": "6", "explanation": "The subarray [4,-1,2,1] has the largest sum 6."},
            {"input": "nums = [1]", "output": "1", "explanation": ""},
            {"input": "nums = [5,4,-1,7,8]", "output": "23", "explanation": ""}
        ],
        "constraints": ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
        "function_signature": "def maxSubArray(nums: list[int]) -> int:",
        "test_cases": [
            {"input": {"nums": [-2,1,-3,4,-1,2,1,-5,4]}, "expected": 6},
            {"input": {"nums": [1]}, "expected": 1},
            {"input": {"nums": [5,4,-1,7,8]}, "expected": 23},
        ]
    },
    "climbing-stairs": {
        "id": 70, "slug": "climbing-stairs", "title": "Climbing Stairs", "difficulty": "Easy",
        "description": "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?",
        "examples": [
            {"input": "n = 2", "output": "2", "explanation": "1. 1 step + 1 step\n2. 2 steps"},
            {"input": "n = 3", "output": "3", "explanation": "1. 1+1+1\n2. 1+2\n3. 2+1"}
        ],
        "constraints": ["1 <= n <= 45"],
        "function_signature": "def climbStairs(n: int) -> int:",
        "test_cases": [
            {"input": {"n": 2}, "expected": 2},
            {"input": {"n": 3}, "expected": 3},
            {"input": {"n": 5}, "expected": 8},
            {"input": {"n": 1}, "expected": 1},
        ]
    },
    "binary-search": {
        "id": 704, "slug": "binary-search", "title": "Binary Search", "difficulty": "Easy",
        "description": "Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.\n\nYou must write an algorithm with O(log n) runtime complexity.",
        "examples": [
            {"input": "nums = [-1,0,3,5,9,12], target = 9", "output": "4", "explanation": "9 exists in nums and its index is 4."},
            {"input": "nums = [-1,0,3,5,9,12], target = 2", "output": "-1", "explanation": "2 does not exist in nums so return -1."}
        ],
        "constraints": ["1 <= nums.length <= 10^4", "-10^4 < nums[i], target < 10^4", "All the integers in nums are unique.", "nums is sorted in ascending order."],
        "function_signature": "def search(nums: list[int], target: int) -> int:",
        "test_cases": [
            {"input": {"nums": [-1,0,3,5,9,12], "target": 9}, "expected": 4},
            {"input": {"nums": [-1,0,3,5,9,12], "target": 2}, "expected": -1},
            {"input": {"nums": [5], "target": 5}, "expected": 0},
        ]
    },
    "fizz-buzz": {
        "id": 412, "slug": "fizz-buzz", "title": "Fizz Buzz", "difficulty": "Easy",
        "description": "Given an integer `n`, return a string array `answer` (1-indexed) where:\n- `answer[i] == \"FizzBuzz\"` if `i` is divisible by 3 and 5.\n- `answer[i] == \"Fizz\"` if `i` is divisible by 3.\n- `answer[i] == \"Buzz\"` if `i` is divisible by 5.\n- `answer[i] == i` (as a string) if none of the above conditions are true.",
        "examples": [
            {"input": "n = 3", "output": '["1","2","Fizz"]', "explanation": ""},
            {"input": "n = 5", "output": '["1","2","Fizz","4","Buzz"]', "explanation": ""},
        ],
        "constraints": ["1 <= n <= 10^4"],
        "function_signature": "def fizzBuzz(n: int) -> list[str]:",
        "test_cases": [
            {"input": {"n": 3}, "expected": ["1","2","Fizz"]},
            {"input": {"n": 5}, "expected": ["1","2","Fizz","4","Buzz"]},
            {"input": {"n": 15}, "expected": ["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]},
        ]
    },
    "single-number": {
        "id": 136, "slug": "single-number", "title": "Single Number", "difficulty": "Easy",
        "description": "Given a non-empty array of integers `nums`, every element appears twice except for one. Find that single one.\n\nYou must implement a solution with a linear runtime complexity and use only constant extra space.",
        "examples": [
            {"input": "nums = [2,2,1]", "output": "1", "explanation": ""},
            {"input": "nums = [4,1,2,1,2]", "output": "4", "explanation": ""},
        ],
        "constraints": ["1 <= nums.length <= 3 * 10^4", "-3 * 10^4 <= nums[i] <= 3 * 10^4", "Each element appears twice except for one."],
        "function_signature": "def singleNumber(nums: list[int]) -> int:",
        "test_cases": [
            {"input": {"nums": [2,2,1]}, "expected": 1},
            {"input": {"nums": [4,1,2,1,2]}, "expected": 4},
            {"input": {"nums": [1]}, "expected": 1},
        ]
    },
    "move-zeroes": {
        "id": 283, "slug": "move-zeroes", "title": "Move Zeroes", "difficulty": "Easy",
        "description": "Given an integer array `nums`, move all `0`'s to the end of it while maintaining the relative order of the non-zero elements.\n\nNote that you must do this in-place without making a copy of the array.",
        "examples": [
            {"input": "nums = [0,1,0,3,12]", "output": "[1,3,12,0,0]", "explanation": ""},
            {"input": "nums = [0]", "output": "[0]", "explanation": ""}
        ],
        "constraints": ["1 <= nums.length <= 10^4", "-2^31 <= nums[i] <= 2^31 - 1"],
        "function_signature": "def moveZeroes(nums: list[int]) -> None:",
        "test_cases": [
            {"input": {"nums": [0,1,0,3,12]}, "expected": [1,3,12,0,0]},
            {"input": {"nums": [0]}, "expected": [0]},
            {"input": {"nums": [1,0,0,3,5]}, "expected": [1,3,5,0,0]},
        ]
    },
    "product-of-array-except-self": {
        "id": 238, "slug": "product-of-array-except-self", "title": "Product of Array Except Self", "difficulty": "Medium",
        "description": "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.\n\nThe product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer.\n\nYou must write an algorithm that runs in O(n) time and without using the division operation.",
        "examples": [
            {"input": "nums = [1,2,3,4]", "output": "[24,12,8,6]", "explanation": ""},
            {"input": "nums = [-1,1,0,-3,3]", "output": "[0,0,9,0,0]", "explanation": ""}
        ],
        "constraints": ["2 <= nums.length <= 10^5", "-30 <= nums[i] <= 30"],
        "function_signature": "def productExceptSelf(nums: list[int]) -> list[int]:",
        "test_cases": [
            {"input": {"nums": [1,2,3,4]}, "expected": [24,12,8,6]},
            {"input": {"nums": [-1,1,0,-3,3]}, "expected": [0,0,9,0,0]},
        ]
    },
    "longest-common-prefix": {
        "id": 14, "slug": "longest-common-prefix", "title": "Longest Common Prefix", "difficulty": "Easy",
        "description": "Write a function to find the longest common prefix string amongst an array of strings.\n\nIf there is no common prefix, return an empty string `\"\"`.",
        "examples": [
            {"input": 'strs = ["flower","flow","flight"]', "output": '"fl"', "explanation": ""},
            {"input": 'strs = ["dog","racecar","car"]', "output": '""', "explanation": "There is no common prefix among the input strings."}
        ],
        "constraints": ["1 <= strs.length <= 200", "0 <= strs[i].length <= 200", "strs[i] consists of only lowercase English letters."],
        "function_signature": "def longestCommonPrefix(strs: list[str]) -> str:",
        "test_cases": [
            {"input": {"strs": ["flower","flow","flight"]}, "expected": "fl"},
            {"input": {"strs": ["dog","racecar","car"]}, "expected": ""},
            {"input": {"strs": ["a"]}, "expected": "a"},
        ]
    },
}

# ─── LeetCode GraphQL helpers ────────────────────────────────────────────────
LEETCODE_GRAPHQL = "https://leetcode.com/graphql"

def parse_leetcode_test_cases(example_testcases_str, meta_data_str, py_snippet):
    """Parse LeetCode's exampleTestcases + metaData into structured test cases."""
    try:
        if not example_testcases_str or not meta_data_str:
            return []
        
        meta = json.loads(meta_data_str)
        params = meta.get("params", [])
        if not params:
            return []
        
        # exampleTestcases is a string with \n-separated values, one per param per test case
        lines = [l.strip() for l in example_testcases_str.strip().split("\n") if l.strip()]
        num_params = len(params)
        
        if num_params == 0 or len(lines) % num_params != 0:
            return []
        
        test_cases = []
        num_cases = len(lines) // num_params
        
        for i in range(num_cases):
            input_dict = {}
            for j, param in enumerate(params):
                raw_val = lines[i * num_params + j]
                try:
                    parsed_val = json.loads(raw_val)
                except:
                    parsed_val = raw_val
                input_dict[param["name"]] = parsed_val
            
            # We don't know expected output from exampleTestcases alone,
            # so we mark these as "example" cases (no expected)
            test_cases.append({
                "input": input_dict,
                "expected": None,  # Will be filled by AI if possible
            })
        
        return test_cases
    except Exception as e:
        print(f"⚠️ Test case parsing failed: {e}")
        return []


def generate_test_cases_ai(title, description, function_signature):
    """Use Groq LLM to generate test cases from problem description."""
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        return []
    
    try:
        import re as _re
        # Extract function name and params from signature
        fn_match = _re.search(r"def\s+(\w+)\s*\(([^)]*)\)", function_signature)
        if not fn_match:
            return []
        
        fn_name = fn_match.group(1)
        params_str = fn_match.group(2)
        
        prompt = f"""Generate exactly 4 test cases for this LeetCode problem as a JSON array.

Problem: {title}
Function: {function_signature}

Each test case must be an object with:
- "input": an object where keys are parameter names ({params_str}) and values are the test inputs
- "expected": the expected return value

Rules:
- Include edge cases (empty input, single element, etc.)
- Use simple, small inputs
- Output ONLY a valid JSON array, nothing else
- No markdown, no explanation

Description: {description[:500]}"""

        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": "You generate test cases as JSON arrays. Output ONLY valid JSON. No markdown."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
                "max_tokens": 600,
            },
            timeout=10,
        )
        
        content = resp.json()["choices"][0]["message"]["content"].strip()
        # Clean markdown if present
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
        
        cases = json.loads(content)
        if isinstance(cases, list) and len(cases) > 0:
            return cases[:4]
    except Exception as e:
        print(f"⚠️ AI test case generation failed: {e}")
    
    return []


def fetch_leetcode_problem(slug):
    """Fetch a problem from LeetCode's GraphQL API with test case parsing."""
    query = """
    query getQuestionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        title
        titleSlug
        difficulty
        content
        exampleTestcaseInput: exampleTestcases
        codeSnippets {
          lang
          code
        }
        sampleTestCase
        metaData
      }
    }
    """
    try:
        resp = requests.post(
            LEETCODE_GRAPHQL,
            json={"query": query, "variables": {"titleSlug": slug}},
            headers={"Content-Type": "application/json", "Referer": "https://leetcode.com"},
            timeout=8
        )
        data = resp.json()
        q = data.get("data", {}).get("question")
        if not q:
            return None
        
        # Extract python snippet
        py_snippet = ""
        for snip in (q.get("codeSnippets") or []):
            if snip["lang"] == "Python3" or snip["lang"] == "Python":
                py_snippet = snip["code"]
                break
        
        # Parse test cases from exampleTestcases + metaData
        test_cases = parse_leetcode_test_cases(
            q.get("exampleTestcaseInput", ""),
            q.get("metaData", ""),
            py_snippet
        )
        
        # If we got inputs but no expected outputs, try AI generation
        if not test_cases or all(tc.get("expected") is None for tc in test_cases):
            ai_cases = generate_test_cases_ai(
                q["title"],
                q.get("content", "")[:1000],
                py_snippet
            )
            if ai_cases:
                test_cases = ai_cases
        
        return {
            "id": int(q["questionId"]),
            "slug": q["titleSlug"],
            "title": q["title"],
            "difficulty": q["difficulty"],
            "description": q["content"],  # HTML
            "function_signature": py_snippet,
            "examples": [],
            "constraints": [],
            "test_cases": test_cases,
            "source": "leetcode"
        }
    except Exception as e:
        print(f"⚠️ LeetCode fetch failed: {e}")
        return None

def search_leetcode_problems(query_str):
    """Search LeetCode problems by keyword."""
    query = """
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
        total: totalNum
        questions: data {
          questionId
          title
          titleSlug
          difficulty
          topicTags { name }
        }
      }
    }
    """
    try:
        resp = requests.post(
            LEETCODE_GRAPHQL,
            json={
                "query": query,
                "variables": {
                    "categorySlug": "",
                    "skip": 0,
                    "limit": 15,
                    "filters": {"searchKeywords": query_str}
                }
            },
            headers={"Content-Type": "application/json", "Referer": "https://leetcode.com"},
            timeout=8
        )
        data = resp.json()
        questions = data.get("data", {}).get("problemsetQuestionList", {}).get("questions", [])
        return [{
            "id": int(q["questionId"]),
            "title": q["title"],
            "slug": q["titleSlug"],
            "difficulty": q["difficulty"],
            "topics": [t["name"] for t in q.get("topicTags", [])],
        } for q in questions]
    except Exception as e:
        print(f"⚠️ LeetCode search failed: {e}")
        return []


# ─── Routes ──────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/code", methods=["GET"])
def get_code():
    """Returns the current content of generated_script.py"""
    if os.path.exists(SCRIPT_PATH):
        with open(SCRIPT_PATH, "r") as f:
            code = f.read()
        return jsonify({"code": code})
    return jsonify({"code": "# No script generated yet."})

LANG_CONFIG = {
    "python": {"ext": ".py", "cmd": lambda f: ["python", f], "compile": None},
    "javascript": {"ext": ".js", "cmd": lambda f: ["node", f], "compile": None},
    "cpp": {"ext": ".cpp", "cmd": lambda f: [f.replace('.cpp', '.exe')], "compile": lambda f: ["g++", "-o", f.replace('.cpp', '.exe'), f]},
}

@app.route("/api/save", methods=["POST"])
def save_code():
    """Saves the code from the editor to the correct file based on language"""
    data = request.json
    code = data.get("code", "")
    language = data.get("language", "python")
    ext = LANG_CONFIG.get(language, LANG_CONFIG["python"])["ext"]
    path = f"generated_script{ext}"
    with open(path, "w") as f:
        f.write(code)
    return jsonify({"status": "saved", "path": path})

@app.route("/api/run", methods=["POST"])
def run_code():
    """Executes the script in the specified language and returns output"""
    input_data = request.json.get("input", "")
    language = request.json.get("language", "python")
    
    config = LANG_CONFIG.get(language, LANG_CONFIG["python"])
    script_path = f"generated_script{config['ext']}"
    
    if not os.path.exists(script_path):
        return jsonify({"output": f"Error: No {language} script found to run."})

    try:
        # Compile step for C++
        if config["compile"]:
            compile_cmd = config["compile"](script_path)
            compile_result = subprocess.run(
                compile_cmd,
                capture_output=True,
                text=True,
                timeout=15
            )
            if compile_result.returncode != 0:
                return jsonify({"output": f"Compilation Error:\n{compile_result.stderr}"})
        
        run_cmd = config["cmd"](script_path)
        result = subprocess.run(
            run_cmd,
            input=input_data,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        output = result.stdout
        if result.stderr:
            output += "\nError:\n" + result.stderr
            
        return jsonify({"output": output})
        
    except subprocess.TimeoutExpired:
        return jsonify({"output": "Error: Execution timed out (limit: 10s)."})
    except Exception as e:
        return jsonify({"output": f"Error executing script: {str(e)}"})

@app.route("/api/process_voice", methods=["POST"])
def process_voice():
    """Receives audio blob, transcibes, and updates code"""
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files["audio"]
    temp_path = os.path.join("recordings", "web_input.wav")
    audio_file.save(temp_path)
    
    print("🎙️ Transcribing audio from web...")
    text = transcribe_audio(temp_path)
    print(f"📝 Text: {text}")
    
    if not text:
        return jsonify({"error": "No speech detected"}), 400

    current_code = ""
    current_code = request.form.get("currentCode", "")
    
    if not current_code and os.path.exists(SCRIPT_PATH):
         with open(SCRIPT_PATH, "r") as f:
            current_code = f.read()

    print("🧠 Sending to LLM...")
    new_code = generate_code(text, current_code=current_code)
    
    with open(SCRIPT_PATH, "w") as f:
        f.write(new_code)
        
    return jsonify({
        "status": "success",
        "transcription": text,
        "code": new_code
    })

# ─── LeetCode Problem Endpoints ─────────────────────────────────────────────
@app.route("/api/leetcode/problem", methods=["GET"])
def get_leetcode_problem():
    """Fetch a problem by slug. Falls back to local bank."""
    slug = request.args.get("slug", "").strip().lower()
    
    if not slug:
        return jsonify({"error": "Missing 'slug' parameter"}), 400
    
    # Try local bank first (instant, has test cases)
    if slug in PROBLEM_BANK:
        problem = PROBLEM_BANK[slug].copy()
        problem["source"] = "local"
        return jsonify({"problem": problem})
    
    # Try LeetCode GraphQL
    problem = fetch_leetcode_problem(slug)
    if problem:
        return jsonify({"problem": problem})
    
    return jsonify({"error": f"Problem '{slug}' not found"}), 404

@app.route("/api/leetcode/search", methods=["GET"])
def search_problems():
    """Search problems by keyword. Searches local bank + LeetCode."""
    q = request.args.get("q", "").strip().lower()
    
    if not q:
        # Return all local bank problems
        results = []
        for slug, prob in PROBLEM_BANK.items():
            results.append({
                "id": prob["id"],
                "title": prob["title"],
                "slug": slug,
                "difficulty": prob["difficulty"],
                "source": "local",
                "has_tests": True,
            })
        return jsonify({"problems": results})
    
    results = []
    
    # Search local bank
    for slug, prob in PROBLEM_BANK.items():
        if q in prob["title"].lower() or q in slug or q == str(prob["id"]):
            results.append({
                "id": prob["id"],
                "title": prob["title"],
                "slug": slug,
                "difficulty": prob["difficulty"],
                "source": "local",
                "has_tests": True,
            })
    
    # Search LeetCode if few local results
    if len(results) < 5:
        lc_results = search_leetcode_problems(q)
        seen_slugs = {r["slug"] for r in results}
        for lc in lc_results:
            if lc["slug"] not in seen_slugs:
                results.append({
                    "id": lc["id"],
                    "title": lc["title"],
                    "slug": lc["slug"],
                    "difficulty": lc["difficulty"],
                    "source": "leetcode",
                    "has_tests": lc["slug"] in PROBLEM_BANK,
                })
    
    return jsonify({"problems": results[:20]})

# ─── Code Verification Endpoint ──────────────────────────────────────────────
@app.route("/api/practice/verify", methods=["POST"])
def verify_code():
    """Run user code against test cases and return verdicts. Supports python, javascript, cpp."""
    data = request.json
    code = data.get("code", "")
    function_name = data.get("function_name", "")
    test_cases = data.get("test_cases", [])
    language = data.get("language", "python")
    
    if not code or not function_name or not test_cases:
        return jsonify({"error": "Missing code, function_name, or test_cases"}), 400
    
    results = []
    
    for i, tc in enumerate(test_cases):
        input_args = tc.get("input", {})
        expected = tc.get("expected")
        
        is_inplace = expected is not None and function_name in ["reverseString", "moveZeroes"]
        
        if language == "python":
            harness, harness_path, run_cmd = _build_python_harness(code, function_name, input_args, is_inplace)
        elif language == "javascript":
            harness, harness_path, run_cmd = _build_js_harness(code, function_name, input_args, is_inplace)
        elif language == "cpp":
            harness, harness_path, run_cmd = _build_cpp_harness(code, function_name, input_args, is_inplace)
        else:
            harness, harness_path, run_cmd = _build_python_harness(code, function_name, input_args, is_inplace)
        
        try:
            with open(harness_path, "w") as f:
                f.write(harness)
            
            # For C++, compile first
            exe_path = None
            if language == "cpp":
                exe_path = "practice_harness.exe"
                compile_proc = subprocess.run(
                    ["g++", "-o", exe_path, harness_path, "-std=c++17"],
                    capture_output=True, text=True, timeout=10,
                )
                if compile_proc.returncode != 0:
                    results.append({
                        "case": i + 1,
                        "status": "runtime_error",
                        "input": input_args,
                        "expected": expected,
                        "actual": None,
                        "error": compile_proc.stderr.strip().split("\n")[-1] if compile_proc.stderr else "Compilation error",
                    })
                    continue
                run_cmd = [f"./{exe_path}"]
            
            proc = subprocess.run(
                run_cmd,
                capture_output=True,
                text=True,
                timeout=5,
                shell=(language == "cpp"),
            )
            
            if proc.returncode != 0:
                results.append({
                    "case": i + 1,
                    "status": "runtime_error",
                    "input": input_args,
                    "expected": expected,
                    "actual": None,
                    "error": proc.stderr.strip().split("\n")[-1] if proc.stderr else "Runtime error",
                })
            else:
                try:
                    actual = json.loads(proc.stdout.strip())
                except:
                    actual = proc.stdout.strip()
                
                # Compare (sort lists for comparison if both are lists)
                passed = False
                if isinstance(actual, list) and isinstance(expected, list):
                    if sorted(map(str, actual)) == sorted(map(str, expected)):
                        passed = True
                    if actual == expected:
                        passed = True
                else:
                    passed = actual == expected
                
                results.append({
                    "case": i + 1,
                    "status": "passed" if passed else "wrong_answer",
                    "input": input_args,
                    "expected": expected,
                    "actual": actual,
                })
                
        except subprocess.TimeoutExpired:
            results.append({
                "case": i + 1,
                "status": "tle",
                "input": input_args,
                "expected": expected,
                "actual": None,
                "error": "Time limit exceeded (5s)",
            })
        except Exception as e:
            results.append({
                "case": i + 1,
                "status": "runtime_error",
                "input": input_args,
                "expected": expected,
                "actual": None,
                "error": str(e),
            })
        finally:
            if os.path.exists(harness_path):
                os.remove(harness_path)
            if language == "cpp" and exe_path and os.path.exists(exe_path):
                os.remove(exe_path)
    
    passed_count = sum(1 for r in results if r["status"] == "passed")
    return jsonify({
        "results": results,
        "summary": {
            "total": len(results),
            "passed": passed_count,
            "failed": len(results) - passed_count,
            "all_passed": passed_count == len(results),
        }
    })


def _build_python_harness(code, function_name, input_args, is_inplace):
    """Build Python test harness."""
    args_str = ", ".join(f"{k}={json.dumps(v)}" for k, v in input_args.items())
    harness_lines = ["import json, sys", ""]
    harness_lines.append(code)
    harness_lines.append("")
    if is_inplace:
        first_param = list(input_args.keys())[0]
        first_val = json.dumps(input_args[first_param])
        harness_lines.append(f"_input = {first_val}")
        harness_lines.append(f"{function_name}(_input)")
        harness_lines.append("print(json.dumps(_input))")
    else:
        harness_lines.append(f"result = {function_name}({args_str})")
        harness_lines.append("print(json.dumps(result))")
    return "\n".join(harness_lines) + "\n", "practice_harness.py", ["python", "practice_harness.py"]


def _build_js_harness(code, function_name, input_args, is_inplace):
    """Build JavaScript test harness."""
    args_vals = ", ".join(json.dumps(v) for v in input_args.values())
    lines = [code, ""]
    if is_inplace:
        first_val = json.dumps(list(input_args.values())[0])
        lines.append(f"let _input = {first_val};")
        lines.append(f"{function_name}(_input);")
        lines.append("console.log(JSON.stringify(_input));")
    else:
        lines.append(f"const result = {function_name}({args_vals});")
        lines.append("console.log(JSON.stringify(result));")
    return "\n".join(lines) + "\n", "practice_harness.js", ["node", "practice_harness.js"]


def _build_cpp_harness(code, function_name, input_args, is_inplace):
    """Build C++ test harness. Wraps user code and adds a main() that prints JSON."""
    args_vals = list(input_args.values())
    
    # Build argument declarations and function call
    arg_decls = []
    call_args = []
    for idx, (k, v) in enumerate(input_args.items()):
        var_name = f"arg{idx}"
        if isinstance(v, list):
            inner = ", ".join(str(x) if isinstance(x, (int, float)) else json.dumps(x) for x in v)
            arg_decls.append(f"  vector<int> {var_name} = {{{inner}}};")
        elif isinstance(v, int):
            arg_decls.append(f"  int {var_name} = {v};")
        elif isinstance(v, str):
            arg_decls.append(f'  string {var_name} = {json.dumps(v)};')
        elif isinstance(v, float):
            arg_decls.append(f"  double {var_name} = {v};")
        elif isinstance(v, bool):
            arg_decls.append(f"  bool {var_name} = {'true' if v else 'false'};")
        else:
            arg_decls.append(f"  int {var_name} = {json.dumps(v)};")
        call_args.append(var_name)
    
    call_str = ", ".join(call_args)
    
    lines = [
        "#include <iostream>",
        "#include <vector>",
        "#include <string>",
        "#include <algorithm>",
        "#include <unordered_map>",
        "#include <sstream>",
        "using namespace std;",
        "",
        code,
        "",
        "int main() {",
    ]
    lines.extend(arg_decls)
    lines.append(f"  Solution sol;")
    lines.append(f"  auto result = sol.{function_name}({call_str});")
    
    # Print result as JSON
    lines.append('  // Print result as JSON')
    lines.append('  cout << "[";')  # fallback for vectors
    lines.append(f'  auto _r = result;')
    lines.append('  if constexpr(is_same_v<decltype(_r), vector<int>>) {')
    lines.append('    for(int i=0;i<_r.size();i++){if(i)cout<<",";cout<<_r[i];}')
    lines.append('  } else if constexpr(is_same_v<decltype(_r), int>) {')
    lines.append('    cout << _r; return 0;')
    lines.append('  } else if constexpr(is_same_v<decltype(_r), bool>) {')
    lines.append('    cout << (_r?"true":"false"); return 0;')
    lines.append('  } else if constexpr(is_same_v<decltype(_r), string>) {')
    lines.append('    cout << "\\"" << _r << "\\""; return 0;')
    lines.append('  }')
    lines.append('  cout << "]";')
    lines.append("  return 0;")
    lines.append("}")
    
    return "\n".join(lines) + "\n", "practice_harness.cpp", ["g++"]  # run_cmd overridden after compile

# ─── Voice-Driven Debugging Endpoint ─────────────────────────────────────────
@app.route("/api/debug_voice", methods=["POST"])
def debug_voice():
    """Receives audio + code + terminal output, returns AI debug diagnosis."""
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files["audio"]
    temp_path = os.path.join("recordings", "debug_input.wav")
    audio_file.save(temp_path)
    
    text = transcribe_audio(temp_path)
    if not text:
        return jsonify({"error": "No speech detected"}), 400
    
    current_code = request.form.get("currentCode", "")
    terminal_output = request.form.get("terminalOutput", "")
    language = request.form.get("language", "python")
    
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        return jsonify({"error": "Missing API key for debug analysis"}), 500
    
    try:
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": f"""You are an expert {language} debugger. The user will give you their code, terminal output (which may contain errors), and a voice command about debugging.

Your response must be a JSON object with these fields:
- "diagnosis": A clear explanation of what's wrong (2-4 sentences)
- "suggestion": How to fix it (2-4 sentences, plain English)
- "fixed_code": The complete corrected code (full file, not a snippet)

Output ONLY valid JSON. No markdown fences."""},
                    {"role": "user", "content": f"Voice command: {text}\n\nCode:\n{current_code}\n\nTerminal output:\n{terminal_output}"},
                ],
                "temperature": 0.1,
                "max_tokens": 1500,
            },
            timeout=15,
        )
        
        content = resp.json()["choices"][0]["message"]["content"].strip()
        # Clean markdown fences if present
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
        
        debug_result = json.loads(content, strict=False)
        debug_result["transcription"] = text
        return jsonify(debug_result)
    except Exception as e:
        print(f"⚠️ Debug analysis failed: {e}")
        return jsonify({
            "diagnosis": "Could not analyze the code. Please try again.",
            "suggestion": str(e),
            "fixed_code": current_code,
            "transcription": text,
        })

# ─── Text-Based Debug for Practice ───────────────────────────────────────────
@app.route("/api/debug_practice", methods=["POST"])
def debug_practice():
    """Accepts code + error + problem context, returns AI debug diagnosis (no voice needed)."""
    data = request.json
    code = data.get("code", "")
    error_output = data.get("error", "")
    problem_title = data.get("problem_title", "")
    problem_description = data.get("problem_description", "")[:500]
    test_results_str = data.get("test_results", "")

    if not code:
        return jsonify({"error": "No code provided"}), 400

    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        return jsonify({"error": "GROQ_API_KEY not set"}), 500

    try:
        context = f"Problem: {problem_title}\nDescription: {problem_description}\n" if problem_title else ""
        error_ctx = f"\nError/Output:\n{error_output}\n" if error_output else ""
        test_ctx = f"\nTest Results:\n{test_results_str}\n" if test_results_str else ""

        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": """You are a coding tutor helping debug practice problems. Analyze the code, error, and test results.
Return a JSON object with these keys:
- "diagnosis": brief explanation of what's wrong (1-2 sentences)
- "suggestion": how to fix it (1-3 sentences, educational)
- "fixed_code": the corrected Python code (complete function)
- "hint": a learning tip related to this bug

Output ONLY valid JSON. No markdown fences."""},
                    {"role": "user", "content": f"{context}Code:\n```\n{code}\n```{error_ctx}{test_ctx}"},
                ],
                "temperature": 0.1,
                "max_tokens": 1500,
            },
            timeout=15,
        )

        content = resp.json()["choices"][0]["message"]["content"].strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

        debug_result = json.loads(content, strict=False)
        return jsonify(debug_result)
    except Exception as e:
        print(f"⚠️ Practice debug failed: {e}")
        return jsonify({
            "diagnosis": "Could not analyze the code. Please try again.",
            "suggestion": str(e),
            "fixed_code": code,
            "hint": "",
        })

if __name__ == "__main__":
    print("🚀 Starting Web IDE at http://localhost:5000")
    app.run(debug=True, port=5000)

