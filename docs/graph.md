# Graph Algorithms

RiriLang includes a built-in `Graph` class for weighted directed graphs and common pathfinding algorithms.

## Usage

```javascript
let g = new Graph();

// Add directed edge: u -> v with weight w
g.add_edge(0, 1, 5); 
g.add_edge(1, 2, 3);

// Optional: Set coordinates for A* heuristic
g.set_pos(0, 0, 0);
g.set_pos(1, 10, 10);

// Algorithms
let dfs_path = g.dfs(0);      // Depth-First Search order
let bfs_path = g.bfs(0);      // Breadth-First Search order
let sp = g.dijkstra(0, 2);    // Shortest Path (Dijkstra)
let astar = g.astar(0, 2);    // Shortest Path (A*)
```

## return values
All traversal and pathfinding methods return a `vector<int>` (array of node IDs).
