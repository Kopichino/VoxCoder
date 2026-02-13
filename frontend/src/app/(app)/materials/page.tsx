'use client';

import React, { useState } from 'react';
import styles from './materials.module.css';

interface Resource {
  title: string;
  url: string;
  source: string;
  sourceIcon: string;
  type: 'tutorial' | 'practice' | 'reference' | 'video';
}

interface TopicData {
  icon: string;
  color: string;
  description: string;
  resources: Resource[];
}

const MATERIALS: Record<string, TopicData> = {
  'Arrays': {
    icon: '📦',
    color: '#6C63FF',
    description: 'Linear data structure storing elements in contiguous memory.',
    resources: [
      { title: 'Arrays in Python', url: 'https://www.geeksforgeeks.org/python-arrays/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'tutorial' },
      { title: 'Python Lists', url: 'https://www.w3schools.com/python/python_lists.asp', source: 'W3Schools', sourceIcon: '🌐', type: 'tutorial' },
      { title: 'Array Problems', url: 'https://leetcode.com/tag/array/', source: 'LeetCode', sourceIcon: '🟡', type: 'practice' },
      { title: 'Array Data Structure', url: 'https://www.programiz.com/dsa/array', source: 'Programiz', sourceIcon: '🔵', type: 'reference' },
      { title: 'Two Pointers Technique', url: 'https://www.geeksforgeeks.org/two-pointers-technique/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'tutorial' },
    ],
  },
  'Linked Lists': {
    icon: '🔗',
    color: '#ED64A6',
    description: 'Dynamic data structure with nodes connected via pointers.',
    resources: [
      { title: 'Linked List in Python', url: 'https://www.geeksforgeeks.org/linked-list-set-1-introduction/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'tutorial' },
      { title: 'Singly Linked Lists', url: 'https://realpython.com/linked-lists-python/', source: 'RealPython', sourceIcon: '🐍', type: 'tutorial' },
      { title: 'Linked List Problems', url: 'https://leetcode.com/tag/linked-list/', source: 'LeetCode', sourceIcon: '🟡', type: 'practice' },
      { title: 'Doubly Linked List', url: 'https://www.geeksforgeeks.org/doubly-linked-list/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'reference' },
    ],
  },
  'Stacks': {
    icon: '📚',
    color: '#38B2AC',
    description: 'LIFO data structure for managing function calls and expressions.',
    resources: [
      { title: 'Stack in Python', url: 'https://www.geeksforgeeks.org/stack-in-python/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'tutorial' },
      { title: 'Python Stack Implementation', url: 'https://www.w3schools.com/python/python_stacks.asp', source: 'W3Schools', sourceIcon: '🌐', type: 'tutorial' },
      { title: 'Stack Problems', url: 'https://leetcode.com/tag/stack/', source: 'LeetCode', sourceIcon: '🟡', type: 'practice' },
      { title: 'Infix to Postfix', url: 'https://www.geeksforgeeks.org/stack-set-2-infix-to-postfix/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'reference' },
    ],
  },
  'Queues': {
    icon: '🚶',
    color: '#ECC94B',
    description: 'FIFO data structure used in scheduling and BFS.',
    resources: [
      { title: 'Queue in Python', url: 'https://www.geeksforgeeks.org/queue-in-python/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'tutorial' },
      { title: 'Python Queues', url: 'https://www.w3schools.com/python/python_queues.asp', source: 'W3Schools', sourceIcon: '🌐', type: 'tutorial' },
      { title: 'Priority Queue', url: 'https://www.geeksforgeeks.org/priority-queue-in-python/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'reference' },
      { title: 'Queue Problems', url: 'https://leetcode.com/tag/queue/', source: 'LeetCode', sourceIcon: '🟡', type: 'practice' },
    ],
  },
  'Trees': {
    icon: '🌳',
    color: '#68D391',
    description: 'Hierarchical data structure with root, children, and leaves.',
    resources: [
      { title: 'Binary Tree in Python', url: 'https://www.geeksforgeeks.org/binary-tree-data-structure/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'tutorial' },
      { title: 'Tree Traversals', url: 'https://www.geeksforgeeks.org/tree-traversals-inorder-preorder-and-postorder/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'tutorial' },
      { title: 'BST Operations', url: 'https://www.programiz.com/dsa/binary-search-tree', source: 'Programiz', sourceIcon: '🔵', type: 'reference' },
      { title: 'Tree Problems', url: 'https://leetcode.com/tag/tree/', source: 'LeetCode', sourceIcon: '🟡', type: 'practice' },
      { title: 'AVL Tree', url: 'https://www.geeksforgeeks.org/avl-tree-set-1-insertion/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'reference' },
    ],
  },
  'Graphs': {
    icon: '🕸️',
    color: '#9F7AEA',
    description: 'Network of nodes and edges for modeling relationships.',
    resources: [
      { title: 'Graph in Python', url: 'https://www.geeksforgeeks.org/graph-and-its-representations/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'tutorial' },
      { title: 'BFS and DFS', url: 'https://www.geeksforgeeks.org/breadth-first-search-or-bfs-for-a-graph/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'tutorial' },
      { title: "Dijkstra's Algorithm", url: 'https://www.geeksforgeeks.org/dijkstras-shortest-path-algorithm-greedy-algo-7/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'reference' },
      { title: 'Graph Problems', url: 'https://leetcode.com/tag/graph/', source: 'LeetCode', sourceIcon: '🟡', type: 'practice' },
    ],
  },
  'Hash Maps': {
    icon: '#️⃣',
    color: '#FC8181',
    description: 'Key-value lookup with O(1) average time using hashing.',
    resources: [
      { title: 'Python Dictionaries', url: 'https://www.w3schools.com/python/python_dictionaries.asp', source: 'W3Schools', sourceIcon: '🌐', type: 'tutorial' },
      { title: 'Hashing in Python', url: 'https://www.geeksforgeeks.org/hashing-set-1-introduction/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'tutorial' },
      { title: 'Hash Table Problems', url: 'https://leetcode.com/tag/hash-table/', source: 'LeetCode', sourceIcon: '🟡', type: 'practice' },
      { title: 'Collections Module', url: 'https://www.geeksforgeeks.org/python-collections-module/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'reference' },
    ],
  },
  'Sorting': {
    icon: '📊',
    color: '#4FD1C5',
    description: 'Algorithms for arranging elements in a specific order.',
    resources: [
      { title: 'Sorting Algorithms', url: 'https://www.geeksforgeeks.org/sorting-algorithms/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'tutorial' },
      { title: 'Python Sort & Sorted', url: 'https://www.w3schools.com/python/ref_list_sort.asp', source: 'W3Schools', sourceIcon: '🌐', type: 'tutorial' },
      { title: 'Merge Sort', url: 'https://www.geeksforgeeks.org/merge-sort/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'reference' },
      { title: 'Quick Sort', url: 'https://www.geeksforgeeks.org/quick-sort/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'reference' },
      { title: 'Sorting Visualizer', url: 'https://visualgo.net/en/sorting', source: 'VisuAlgo', sourceIcon: '🎨', type: 'video' },
    ],
  },
  'Dynamic Programming': {
    icon: '🧩',
    color: '#F6AD55',
    description: 'Solve complex problems by breaking into overlapping subproblems.',
    resources: [
      { title: 'DP Introduction', url: 'https://www.geeksforgeeks.org/dynamic-programming/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'tutorial' },
      { title: 'DP Patterns', url: 'https://leetcode.com/discuss/general-discussion/458695/dynamic-programming-patterns', source: 'LeetCode', sourceIcon: '🟡', type: 'tutorial' },
      { title: 'Knapsack Problem', url: 'https://www.geeksforgeeks.org/0-1-knapsack-problem-dp-10/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'reference' },
      { title: 'LCS Problem', url: 'https://www.geeksforgeeks.org/longest-common-subsequence-dp-4/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'reference' },
      { title: 'DP Problems', url: 'https://leetcode.com/tag/dynamic-programming/', source: 'LeetCode', sourceIcon: '🟡', type: 'practice' },
    ],
  },
  'Recursion': {
    icon: '🔄',
    color: '#B794F4',
    description: 'Solve problems by defining solutions in terms of themselves.',
    resources: [
      { title: 'Recursion in Python', url: 'https://www.geeksforgeeks.org/recursion-in-python/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'tutorial' },
      { title: 'Python Recursion', url: 'https://www.w3schools.com/python/gloss_python_function_recursion.asp', source: 'W3Schools', sourceIcon: '🌐', type: 'tutorial' },
      { title: 'Backtracking', url: 'https://www.geeksforgeeks.org/backtracking-algorithms/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'reference' },
      { title: 'Tower of Hanoi', url: 'https://www.geeksforgeeks.org/c-program-for-tower-of-hanoi/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'reference' },
    ],
  },
  'Strings': {
    icon: '🔤',
    color: '#63B3ED',
    description: 'Sequence of characters — pattern matching, parsing, and manipulation.',
    resources: [
      { title: 'Python Strings', url: 'https://www.w3schools.com/python/python_strings.asp', source: 'W3Schools', sourceIcon: '🌐', type: 'tutorial' },
      { title: 'String Problems', url: 'https://www.geeksforgeeks.org/string-data-structure/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'tutorial' },
      { title: 'Regex in Python', url: 'https://www.w3schools.com/python/python_regex.asp', source: 'W3Schools', sourceIcon: '🌐', type: 'reference' },
      { title: 'String Problems', url: 'https://leetcode.com/tag/string/', source: 'LeetCode', sourceIcon: '🟡', type: 'practice' },
    ],
  },
  'Heaps': {
    icon: '⛰️',
    color: '#FEB2B2',
    description: 'Tree-based structure for efficient priority access.',
    resources: [
      { title: 'Heap in Python', url: 'https://www.geeksforgeeks.org/heap-queue-or-heapq-in-python/', source: 'GeeksforGeeks', sourceIcon: '🟢', type: 'tutorial' },
      { title: 'Min/Max Heap', url: 'https://www.programiz.com/dsa/heap-data-structure', source: 'Programiz', sourceIcon: '🔵', type: 'reference' },
      { title: 'Heap Problems', url: 'https://leetcode.com/tag/heap-priority-queue/', source: 'LeetCode', sourceIcon: '🟡', type: 'practice' },
    ],
  },
};

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  tutorial: { label: 'Tutorial', className: 'badgeTutorial' },
  practice: { label: 'Practice', className: 'badgePractice' },
  reference: { label: 'Reference', className: 'badgeReference' },
  video: { label: 'Visual', className: 'badgeVideo' },
};

export default function MaterialsPage() {
  const [search, setSearch] = useState('');
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const topics = Object.entries(MATERIALS).filter(([name]) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.materials}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Learning Materials</h1>
          <p className={styles.subtitle}>Curated resources for each data structure and topic</p>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchBar}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Search topics..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Quick Legend */}
      <div className={styles.legend}>
        <span className={`${styles.legendBadge} ${styles.badgeTutorial}`}>📖 Tutorial</span>
        <span className={`${styles.legendBadge} ${styles.badgePractice}`}>💪 Practice</span>
        <span className={`${styles.legendBadge} ${styles.badgeReference}`}>📄 Reference</span>
        <span className={`${styles.legendBadge} ${styles.badgeVideo}`}>🎨 Visual</span>
      </div>

      {/* Topic Cards */}
      <div className={styles.topicsGrid}>
        {topics.map(([name, data], idx) => {
          const isExpanded = expandedTopic === name;
          return (
            <div
              key={name}
              className={`${styles.topicCard} ${isExpanded ? styles.topicExpanded : ''}`}
              style={{ animationDelay: `${idx * 0.04}s`, '--topic-color': data.color } as React.CSSProperties}
            >
              <button
                className={styles.topicHeader}
                onClick={() => setExpandedTopic(isExpanded ? null : name)}
              >
                <div className={styles.topicLeft}>
                  <span className={styles.topicIcon}>{data.icon}</span>
                  <div>
                    <h3 className={styles.topicName}>{name}</h3>
                    <p className={styles.topicDesc}>{data.description}</p>
                  </div>
                </div>
                <div className={styles.topicMeta}>
                  <span className={styles.resourceCount}>{data.resources.length} resources</span>
                  <span className={styles.expandArrow}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </button>

              {isExpanded && (
                <div className={styles.resourceList}>
                  {data.resources.map((res, i) => {
                    const badge = TYPE_BADGES[res.type];
                    return (
                      <a
                        key={i}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.resourceItem}
                      >
                        <div className={styles.resourceInfo}>
                          <span className={styles.resourceTitle}>{res.title}</span>
                          <span className={styles.resourceSource}>{res.sourceIcon} {res.source}</span>
                        </div>
                        <span className={`${styles.typeBadge} ${styles[badge.className]}`}>
                          {badge.label}
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {topics.length === 0 && (
        <div className={styles.empty}>
          <span>🔍</span>
          <p>No topics found for &quot;{search}&quot;</p>
        </div>
      )}
    </div>
  );
}
