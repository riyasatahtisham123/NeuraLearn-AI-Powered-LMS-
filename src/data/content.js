/**
 * Course content — transcribed from the project's seed.py / SQLite database.
 * 3 courses · 12 topics · 36 resources · 12 quizzes · 50 questions.
 * Topics are the unit the AI module analyses to find strengths and learning gaps.
 */

export const LEVELS = ['Easy', 'Medium', 'Hard']

export const RESOURCE_TYPES = {
  article: { label: 'Article', tone: 'cyan' },
  video: { label: 'Video', tone: 'magenta' },
  pdf: { label: 'PDF Notes', tone: 'amber' },
  practice: { label: 'Practice', tone: 'lime' },
}

const yt = (q) => `https://www.youtube.com/results?search_query=${q}`

export const COURSES = [
  {
    id: 1,
    code: 'CS-201',
    title: 'Python Programming',
    description: 'Core Python syntax, control flow, functions and objects.',
    tone: 'cyan',
    credits: 4,
    semester: 'III',
    instructor: 'Mr. Abrarul Haque Siddiqui',
    topics: [
      {
        id: 11,
        name: 'Python Basics',
        description: 'Variables, data types, operators and input-output.',
        difficulty: 1,
        position: 1,
        estMinutes: 45,
        resources: [
          { id: 111, title: 'Variables and Data Types', rtype: 'article', difficulty: 1, minutes: 15, url: 'https://docs.python.org/3/tutorial/introduction.html', description: 'Understand int, float, string and bool and how variables store values in Python.' },
          { id: 112, title: 'Python Operators Practice Sheet', rtype: 'practice', difficulty: 1, minutes: 25, url: '', description: 'Practice arithmetic, comparison and logical operators with solved examples.' },
          { id: 113, title: 'Introduction to Python (video)', rtype: 'video', difficulty: 1, minutes: 18, url: yt('python+basics+tutorial'), description: 'A short video covering the interpreter, printing and basic syntax.' },
        ],
        questions: [
          { id: 1101, text: 'Which function is used to display output on the screen?', options: { a: 'echo()', b: 'print()', c: 'console.log()', d: 'write()' }, correct: 'b', marks: 1, explain: 'print() writes its arguments to standard output followed by a newline.' },
          { id: 1102, text: 'What is the data type of the value 3.14?', options: { a: 'int', b: 'str', c: 'float', d: 'bool' }, correct: 'c', marks: 1, explain: 'A literal with a decimal point is a floating point number in Python.' },
          { id: 1103, text: 'Which operator gives the remainder of a division?', options: { a: '/', b: '//', c: '%', d: '*' }, correct: 'c', marks: 1, explain: '% is the modulo operator; // is floor division and / is true division.' },
          { id: 1104, text: 'Python variables are declared with which keyword?', options: { a: 'var', b: 'int', c: 'dim', d: 'none, just assign them' }, correct: 'd', marks: 1, explain: 'Python is dynamically typed — a variable is created the moment you assign to it.' },
        ],
      },
      {
        id: 12,
        name: 'Control Flow',
        description: 'if-else, while loops, for loops and break-continue.',
        difficulty: 2,
        position: 2,
        estMinutes: 60,
        resources: [
          { id: 121, title: 'if-else and Looping', rtype: 'article', difficulty: 2, minutes: 20, url: 'https://docs.python.org/3/tutorial/controlflow.html', description: 'How conditions and loops control the flow of a Python program.' },
          { id: 122, title: 'Loop Tracing Worksheet', rtype: 'practice', difficulty: 2, minutes: 30, url: '', description: 'Trace for and while loops step by step to master iteration.' },
          { id: 123, title: 'Nested Loops Explained', rtype: 'video', difficulty: 2, minutes: 22, url: yt('python+nested+loops'), description: 'Working with loops inside loops and printing patterns.' },
        ],
        questions: [
          { id: 1201, text: 'Which loop runs a fixed number of times over a sequence?', options: { a: 'while', b: 'for', c: 'do-while', d: 'repeat' }, correct: 'b', marks: 1, explain: 'A for loop iterates over the items of a sequence in order.' },
          { id: 1202, text: 'Which statement skips the rest of the current loop iteration?', options: { a: 'break', b: 'pass', c: 'continue', d: 'return' }, correct: 'c', marks: 1, explain: 'continue jumps to the next iteration; break leaves the loop entirely.' },
          { id: 1203, text: 'What does the range(1, 5) function produce?', options: { a: '1 2 3 4 5', b: '1 2 3 4', c: '0 1 2 3 4 5', d: '5' }, correct: 'b', marks: 1, explain: 'range(start, stop) includes start and excludes stop.' },
          { id: 1204, text: 'Which keyword starts a conditional block in Python?', options: { a: 'when', b: 'case', c: 'if', d: 'check' }, correct: 'c', marks: 1, explain: 'if begins a conditional block, optionally followed by elif and else.' },
          { id: 1205, text: 'An empty loop body can be written using which statement?', options: { a: 'none', b: 'pass', c: 'skip', d: 'null' }, correct: 'b', marks: 1, explain: 'pass is a null operation used as a placeholder where a statement is required.' },
        ],
      },
      {
        id: 13,
        name: 'Functions',
        description: 'Defining functions, arguments, return values and scope.',
        difficulty: 2,
        position: 3,
        estMinutes: 55,
        resources: [
          { id: 131, title: 'Defining Functions', rtype: 'article', difficulty: 2, minutes: 18, url: 'https://docs.python.org/3/tutorial/controlflow.html#defining-functions', description: 'def keyword, parameters, default arguments and return values.' },
          { id: 132, title: 'Scope and Local Variables', rtype: 'pdf', difficulty: 2, minutes: 20, url: '', description: 'Understanding local versus global variables inside functions.' },
          { id: 133, title: 'Function Practice Problems', rtype: 'practice', difficulty: 2, minutes: 35, url: '', description: 'Write functions for sum, factorial and prime checking.' },
        ],
        questions: [
          { id: 1301, text: 'Which keyword defines a function?', options: { a: 'func', b: 'def', c: 'define', d: 'lambda only' }, correct: 'b', marks: 1, explain: 'def name(parameters): introduces a function definition.' },
          { id: 1302, text: 'What does a function return if it has no return statement?', options: { a: '0', b: 'None', c: 'empty string', d: 'error' }, correct: 'b', marks: 1, explain: 'Falling off the end of a function returns the None object.' },
          { id: 1303, text: 'A function that calls itself is called?', options: { a: 'nested', b: 'inline', c: 'recursive', d: 'static' }, correct: 'c', marks: 1, explain: 'Recursion is a function calling itself with a smaller sub-problem.' },
          { id: 1304, text: 'Which argument type uses name=value at call time?', options: { a: 'positional', b: 'default', c: 'keyword', d: 'variable' }, correct: 'c', marks: 1, explain: 'Keyword arguments are passed by parameter name and may appear in any order.' },
        ],
      },
      {
        id: 14,
        name: 'Object Oriented Programming',
        description: 'Classes, objects, inheritance and constructors.',
        difficulty: 3,
        position: 4,
        estMinutes: 80,
        resources: [
          { id: 141, title: 'Classes and Objects', rtype: 'article', difficulty: 3, minutes: 25, url: 'https://docs.python.org/3/tutorial/classes.html', description: 'Modeling real-world entities with classes and creating objects from them.' },
          { id: 142, title: 'Inheritance and Polymorphism', rtype: 'video', difficulty: 3, minutes: 28, url: yt('python+inheritance+tutorial'), description: 'Reusing a parent class and overriding its behaviour.' },
          { id: 143, title: 'OOP Mini Project Ideas', rtype: 'practice', difficulty: 3, minutes: 45, url: '', description: 'Build a student record and bank account class to practise OOP.' },
        ],
        questions: [
          { id: 1401, text: 'What is the constructor method in Python?', options: { a: 'init', b: '__init__', c: 'constructor', d: '__new__' }, correct: 'b', marks: 1, explain: '__init__ initialises a newly created instance; __new__ creates it.' },
          { id: 1402, text: 'The first parameter of an instance method is conventionally named?', options: { a: 'this', b: 'self', c: 'obj', d: 'me' }, correct: 'b', marks: 1, explain: 'self refers to the instance the method was called on.' },
          { id: 1403, text: 'Which concept lets one class inherit another?', options: { a: 'Encapsulation', b: 'Inheritance', c: 'Overloading', d: 'Compilation' }, correct: 'b', marks: 1, explain: 'Inheritance lets a child class reuse and extend a parent class.' },
          { id: 1404, text: 'Data hiding inside a class is called?', options: { a: 'abstraction', b: 'polymorphism', c: 'encapsulation', d: 'inheritance' }, correct: 'c', marks: 1, explain: 'Encapsulation bundles data with the methods that operate on it and restricts direct access.' },
        ],
      },
    ],
  },
  {
    id: 2,
    code: 'CS-202',
    title: 'Data Structures and Algorithms',
    description: 'Linear and tree data structures with their algorithm analysis.',
    tone: 'magenta',
    credits: 4,
    semester: 'III',
    instructor: 'Dr. S. Verma',
    topics: [
      {
        id: 21,
        name: 'Arrays',
        description: 'Array representation, traversal, searching and insertion.',
        difficulty: 1,
        position: 1,
        estMinutes: 40,
        resources: [
          { id: 211, title: 'Array Basics', rtype: 'article', difficulty: 1, minutes: 15, url: 'https://www.geeksforgeeks.org/array-data-structure/', description: 'Memory representation and index based access in arrays.' },
          { id: 212, title: 'Array Operations Practice', rtype: 'practice', difficulty: 1, minutes: 30, url: '', description: 'Insertion, deletion and traversal problems with solutions.' },
          { id: 213, title: 'Two Pointer Technique', rtype: 'video', difficulty: 2, minutes: 20, url: yt('two+pointer+technique'), description: 'Solving array problems efficiently using two pointers.' },
        ],
        questions: [
          { id: 2101, text: 'Time complexity to access an array element by index is?', options: { a: 'O(n)', b: 'O(1)', c: 'O(log n)', d: 'O(n^2)' }, correct: 'b', marks: 1, explain: 'The address is base + index × element size, computed in constant time.' },
          { id: 2102, text: 'Inserting at the beginning of an array of n elements costs?', options: { a: 'O(1)', b: 'O(log n)', c: 'O(n)', d: 'O(n log n)' }, correct: 'c', marks: 1, explain: 'Every existing element must shift one position to the right.' },
          { id: 2103, text: 'Arrays store elements in memory as?', options: { a: 'random locations', b: 'contiguous locations', c: 'linked nodes', d: 'hash buckets' }, correct: 'b', marks: 1, explain: 'Contiguous storage is what makes index arithmetic possible.' },
          { id: 2104, text: 'Binary search requires the array to be?', options: { a: 'sorted', b: 'empty', c: 'integer only', d: 'unsorted' }, correct: 'a', marks: 1, explain: 'Halving the search space only works when order is guaranteed.' },
        ],
      },
      {
        id: 22,
        name: 'Linked Lists',
        description: 'Singly, doubly and circular linked lists and their operations.',
        difficulty: 2,
        position: 2,
        estMinutes: 65,
        resources: [
          { id: 221, title: 'Singly Linked List', rtype: 'article', difficulty: 2, minutes: 20, url: 'https://www.geeksforgeeks.org/data-structures/linked-list/', description: 'Node structure, insertion and deletion at head and tail.' },
          { id: 222, title: 'Doubly and Circular Lists', rtype: 'pdf', difficulty: 2, minutes: 22, url: '', description: 'Comparison of variants and where each is useful.' },
          { id: 223, title: 'Reverse a Linked List', rtype: 'practice', difficulty: 2, minutes: 35, url: '', description: 'Iterative and recursive reversal practice problems.' },
        ],
        questions: [
          { id: 2201, text: 'A linked list node stores data and a pointer to?', options: { a: 'itself', b: 'the previous node only', c: 'the next node', d: 'the head index' }, correct: 'c', marks: 1, explain: 'A singly linked node holds a value and a reference to its successor.' },
          { id: 2202, text: 'Advantage of a linked list over an array is?', options: { a: 'faster access', b: 'dynamic size', c: 'less memory', d: 'sorted order' }, correct: 'b', marks: 1, explain: 'Nodes are allocated on demand, so the structure grows without resizing.' },
          { id: 2203, text: 'In a doubly linked list each node has how many pointers?', options: { a: '1', b: '2', c: '3', d: '0' }, correct: 'b', marks: 1, explain: 'prev and next allow traversal in both directions.' },
          { id: 2204, text: 'Deleting the head node of a singly list is?', options: { a: 'O(n)', b: 'O(1)', c: 'O(log n)', d: 'O(n^2)' }, correct: 'b', marks: 1, explain: 'Only the head reference is reassigned to head.next.' },
        ],
      },
      {
        id: 23,
        name: 'Stacks and Queues',
        description: 'LIFO and FIFO structures, expressions and applications.',
        difficulty: 2,
        position: 3,
        estMinutes: 60,
        resources: [
          { id: 231, title: 'Stack LIFO Structure', rtype: 'article', difficulty: 2, minutes: 18, url: 'https://www.geeksforgeeks.org/stack-data-structure/', description: 'Push, pop, overflow and underflow conditions.' },
          { id: 232, title: 'Queue FIFO Structure', rtype: 'video', difficulty: 2, minutes: 20, url: yt('queue+data+structure'), description: 'Enqueue, dequeue and types of queues.' },
          { id: 233, title: 'Expression Conversion Problems', rtype: 'practice', difficulty: 3, minutes: 40, url: '', description: 'Infix to postfix conversions using a stack.' },
        ],
        questions: [
          { id: 2301, text: 'A stack works on which principle?', options: { a: 'FIFO', b: 'LIFO', c: 'random', d: 'priority' }, correct: 'b', marks: 1, explain: 'Last In First Out — the most recently pushed item is popped first.' },
          { id: 2302, text: 'A queue works on which principle?', options: { a: 'LIFO', b: 'FIFO', c: 'LILO', d: 'priority' }, correct: 'b', marks: 1, explain: 'First In First Out — items leave in the order they arrived.' },
          { id: 2303, text: 'Which structure is used for function call management?', options: { a: 'queue', b: 'stack', c: 'array', d: 'graph' }, correct: 'b', marks: 1, explain: 'The call stack stores activation records and unwinds on return.' },
          { id: 2304, text: 'Trying to pop an empty stack gives?', options: { a: 'zero', b: 'underflow error', c: 'overflow', d: 'None' }, correct: 'b', marks: 1, explain: 'Popping below the empty state is the stack underflow condition.' },
        ],
      },
      {
        id: 24,
        name: 'Trees and Traversal',
        description: 'Binary trees, BST operations and traversal orders.',
        difficulty: 3,
        position: 4,
        estMinutes: 85,
        resources: [
          { id: 241, title: 'Binary Tree Basics', rtype: 'article', difficulty: 3, minutes: 22, url: 'https://www.geeksforgeeks.org/introduction-to-tree-data-structure/', description: 'Root, node, leaf, height and level terminology.' },
          { id: 242, title: 'Binary Search Tree', rtype: 'pdf', difficulty: 3, minutes: 26, url: '', description: 'Insertion, search and deletion in a BST.' },
          { id: 243, title: 'Traversal Orders', rtype: 'practice', difficulty: 3, minutes: 40, url: '', description: 'Inorder, preorder and postorder practice with diagrams.' },
        ],
        questions: [
          { id: 2401, text: 'Inorder traversal of a BST gives values in?', options: { a: 'random order', b: 'descending order', c: 'ascending order', d: 'level order' }, correct: 'c', marks: 1, explain: 'Left–Root–Right on a BST visits keys in sorted ascending order.' },
          { id: 2402, text: 'Maximum number of children of a node in a binary tree?', options: { a: '1', b: '2', c: '3', d: 'many' }, correct: 'b', marks: 1, explain: 'Binary means at most two children: left and right.' },
          { id: 2403, text: 'Height of a balanced tree with n nodes is?', options: { a: 'n', b: 'n/2', c: 'log n', d: 'n^2' }, correct: 'c', marks: 1, explain: 'Each level doubles capacity, so height grows logarithmically.' },
          { id: 2404, text: 'Preorder visits root then?', options: { a: 'right left root', b: 'left right', c: 'root left right', d: 'level by level' }, correct: 'b', marks: 1, explain: 'Preorder is Root–Left–Right; after the root it recurses left then right.' },
        ],
      },
    ],
  },
  {
    id: 3,
    code: 'CS-203',
    title: 'Database Management Systems',
    description: 'Relational model, SQL queries, normalization and transactions.',
    tone: 'lime',
    credits: 3,
    semester: 'IV',
    instructor: 'Ms. N. Fatima',
    topics: [
      {
        id: 31,
        name: 'Introduction to DBMS',
        description: 'File systems versus DBMS, architecture and data models.',
        difficulty: 1,
        position: 1,
        estMinutes: 40,
        resources: [
          { id: 311, title: 'What is a DBMS', rtype: 'article', difficulty: 1, minutes: 14, url: 'https://www.geeksforgeeks.org/introduction-of-database-management-system/', description: 'Advantages of a DBMS over file based storage.' },
          { id: 312, title: 'Three Level Architecture', rtype: 'pdf', difficulty: 1, minutes: 18, url: '', description: 'External, conceptual and internal levels with data independence.' },
          { id: 313, title: 'Key Terminology Sheet', rtype: 'practice', difficulty: 1, minutes: 20, url: '', description: 'Entity, attribute, tuple, domain and relation definitions.' },
        ],
        questions: [
          { id: 3101, text: 'DBMS stands for?', options: { a: 'Database Management System', b: 'Data Backup Management Service', c: 'Digital Base Machine System', d: 'None' }, correct: 'a', marks: 1, explain: 'A DBMS is software that defines, stores, retrieves and manages data in a database.' },
          { id: 3102, text: 'A row in a relation is called a?', options: { a: 'attribute', b: 'tuple', c: 'domain', d: 'field' }, correct: 'b', marks: 1, explain: 'Rows are tuples; columns are attributes.' },
          { id: 3103, text: 'Which level is closest to the physical storage?', options: { a: 'external', b: 'conceptual', c: 'internal', d: 'view' }, correct: 'c', marks: 1, explain: 'The internal level describes how data is physically stored on disk.' },
          { id: 3104, text: 'A primary key must be?', options: { a: 'nullable', b: 'unique and not null', c: 'always string', d: 'repeated' }, correct: 'b', marks: 1, explain: 'A primary key uniquely identifies each tuple and cannot contain NULL.' },
        ],
      },
      {
        id: 32,
        name: 'SQL Queries',
        description: 'DDL, DML, joins, grouping and subqueries.',
        difficulty: 2,
        position: 2,
        estMinutes: 70,
        resources: [
          { id: 321, title: 'SELECT and WHERE Basics', rtype: 'article', difficulty: 2, minutes: 18, url: 'https://www.w3schools.com/sql/sql_select.asp', description: 'Filtering rows and choosing columns from a table.' },
          { id: 322, title: 'Joins Explained', rtype: 'video', difficulty: 2, minutes: 24, url: yt('sql+joins+tutorial'), description: 'Inner, left, right and full outer joins with diagrams.' },
          { id: 323, title: 'GROUP BY Practice Set', rtype: 'practice', difficulty: 2, minutes: 35, url: '', description: 'Aggregation queries with HAVING clause problems.' },
        ],
        questions: [
          { id: 3201, text: 'Which command removes a table structure completely?', options: { a: 'DELETE TABLE', b: 'DROP TABLE', c: 'REMOVE TABLE', d: 'TRUST TABLE' }, correct: 'b', marks: 1, explain: 'DROP TABLE removes the definition and all data; DELETE only removes rows.' },
          { id: 3202, text: 'Which clause filters rows before grouping?', options: { a: 'HAVING', b: 'WHERE', c: 'ORDER', d: 'GROUP' }, correct: 'b', marks: 1, explain: 'WHERE runs before GROUP BY; HAVING filters the grouped results.' },
          { id: 3203, text: 'Which join returns only matching rows?', options: { a: 'left outer', b: 'right outer', c: 'inner', d: 'full' }, correct: 'c', marks: 1, explain: 'INNER JOIN keeps only rows with a match on both sides.' },
          { id: 3204, text: 'Which aggregate ignores NULL values?', options: { a: 'COUNT(*)', b: 'SUM', c: 'COUNT(column)', d: 'MAX' }, correct: 'c', marks: 1, explain: 'COUNT(column) counts non-NULL values; COUNT(*) counts every row.' },
          { id: 3205, text: 'The language used to define schema is?', options: { a: 'DML', b: 'DCL', c: 'DDL', d: 'TCL' }, correct: 'c', marks: 1, explain: 'DDL (CREATE, ALTER, DROP) defines structure; DML manipulates the data.' },
        ],
      },
      {
        id: 33,
        name: 'Normalization',
        description: 'Functional dependencies and 1NF to BCNF forms.',
        difficulty: 3,
        position: 3,
        estMinutes: 90,
        resources: [
          { id: 331, title: 'Functional Dependencies', rtype: 'article', difficulty: 3, minutes: 24, url: 'https://www.geeksforgeeks.org/introduction-of-functional-dependency-in-dbms/', description: 'Finding closure of attributes and candidate keys.' },
          { id: 332, title: '1NF 2NF 3NF BCNF', rtype: 'pdf', difficulty: 3, minutes: 30, url: '', description: 'Each normal form explained with an example table.' },
          { id: 333, title: 'Decomposition Exercises', rtype: 'practice', difficulty: 3, minutes: 45, url: '', description: 'Convert an unnormalised sheet into 3NF tables.' },
        ],
        questions: [
          { id: 3301, text: '1NF requires attribute values to be?', options: { a: 'repeat groups', b: 'atomic', c: 'nullable', d: 'multivalued' }, correct: 'b', marks: 1, explain: 'First normal form forbids repeating groups and composite attribute values.' },
          { id: 3302, text: '2NF removes which type of dependency?', options: { a: 'partial', b: 'transitive', c: 'multi-valued', d: 'trivial' }, correct: 'a', marks: 1, explain: '2NF is 1NF plus no non-prime attribute partially dependent on a candidate key.' },
          { id: 3303, text: '3NF removes which dependency?', options: { a: 'partial', b: 'transitive', c: 'full', d: 'join' }, correct: 'b', marks: 1, explain: '3NF eliminates transitive dependency of non-prime attributes on the key.' },
          { id: 3304, text: 'In BCNF every determinant must be a?', options: { a: 'foreign key', b: 'super key', c: 'primary value', d: 'index' }, correct: 'b', marks: 1, explain: 'BCNF is stricter than 3NF: for every X→Y, X must be a super key.' },
        ],
      },
      {
        id: 34,
        name: 'Transactions and Concurrency',
        description: 'ACID properties, schedules and deadlock handling.',
        difficulty: 3,
        position: 4,
        estMinutes: 75,
        resources: [
          { id: 341, title: 'ACID Properties', rtype: 'article', difficulty: 3, minutes: 20, url: 'https://www.geeksforgeeks.org/acid-properties-in-dbms/', description: 'Atomicity, consistency, isolation and durability.' },
          { id: 342, title: 'Schedules and Serializability', rtype: 'video', difficulty: 3, minutes: 26, url: yt('dbms+concurrency+control'), description: 'Conflict serializable schedule testing.' },
          { id: 343, title: 'Deadlock Problems', rtype: 'practice', difficulty: 3, minutes: 35, url: '', description: 'Wait-for graph and deadlock prevention practice.' },
        ],
        questions: [
          { id: 3401, text: 'The A in ACID stands for?', options: { a: 'Availability', b: 'Atomicity', c: 'Accuracy', d: 'Access' }, correct: 'b', marks: 1, explain: 'Atomicity means a transaction completes fully or not at all.' },
          { id: 3402, text: 'A transaction is the unit of what?', options: { a: 'storage', b: 'work', c: 'indexing', d: 'backup' }, correct: 'b', marks: 1, explain: 'A transaction is a logical unit of work performed against the database.' },
          { id: 3403, text: 'Two transactions waiting for each other is?', options: { a: 'starvation', b: 'deadlock', c: 'livelock', d: 'rollback' }, correct: 'b', marks: 1, explain: 'A cycle in the wait-for graph is a deadlock.' },
          { id: 3404, text: 'Which property guarantees recovery after failure?', options: { a: 'atomicity', b: 'durability', c: 'isolation', d: 'consistency' }, correct: 'b', marks: 1, explain: 'Durability ensures committed changes survive crashes and power loss.' },
        ],
      },
    ],
  },
]

/** One quiz per topic, mirroring the quizzes table. */
export const QUIZZES = COURSES.flatMap((c) =>
  c.topics.map((t) => ({
    id: t.id,
    topicId: t.id,
    courseId: c.id,
    title: `Quiz: ${t.name}`,
    passMark: 60,
    durationSec: t.questions.length * 60,
  })),
)

export const PROJECT = {
  name: 'NeuraLearn',
  fullTitle: 'AI-Powered Personalized Learning Management System',
  code: 'PCS 26 / 43',
  university: 'Integral University, Lucknow',
  degree: 'Bachelor of Technology · Computer Science & Engineering',
  session: '2026–2027',
  supervisor: 'Mr. Abrarul Haque Siddiqui',
  team: [
    { name: 'Farhan Nadeem', roll: '2300101833', role: 'Frontend Development' },
    { name: 'Farhan Ahmad', roll: '2300101643', role: 'Backend & Database' },
    { name: 'Aman Shadab Afsar', roll: '2300104876', role: 'AI / ML Module' },
  ],
  stack: ['React', 'Vite', 'JavaScript', 'TF-IDF', 'Cosine Similarity', 'Linear Regression', 'Recharts'],
}