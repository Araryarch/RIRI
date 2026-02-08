
# RiriLang API Framework Implementation Plan

We will add API development capabilities to RiriLang by integrating `cpp-httplib`, enabling the creation of standalone HTTP servers with endpoints and middleware.

## User Requirements
-   Create APIs with endpoints (GET, POST, etc.)
-   Support Middleware
-   "Simple" JavaScript-like syntax (Express.js style)

## Architecture
-   **Backend**: `cpp-httplib` (Single header C++ HTTP server).
-   **Runtime**: RiriLang compiles to C++ binary that links against `httplib`.
-   **Language Extensions**:
    -   `new Server()` -> `httplib::Server` (wrapped).
    -   `req` / `res` objects mapping to `httplib::Request` / `httplib::Response`.

## Step-by-Step Implementation

### Phase 1: Dependencies & Setup
1.  **Get `httplib.h`**: Download or create `src/include/httplib.h` (using wget from GitHub or similar source).
2.  **Update Compiler**: 
    -   Modify `codegen.ts` to `#include "httplib.h"` if `Server` is used (or always).
    -   Link against `libpthread` (required by httplib) and maybe `openssl` if HTTPS is needed (skip HTTPS for MVP).

### Phase 2: Core Server Class
1.  **Codegen for `Server`**:
    -   Structure: `struct RiriServer { httplib::Server svr; ... }`? or direct mapping.
    -   `new Server()` -> `std::make_shared<httplib::Server>()`.
2.  **Methods**:
    -   `listen(port)` -> `svr.listen("0.0.0.0", port)`.
    -   `get(path, callback)` -> `svr.Get(path, handler)`.
    -   `post(path, callback)` -> `svr.Post(path, handler)`.

### Phase 3: Request/Response Wrappers
1.  **Handler Signature**: `[=](const httplib::Request& req, httplib::Response& res) { ... }`.
2.  **Wrapper Objects**:
    -   RiriLang callbacks expect `(req, res)`.
    -   We need to ensure `req` and `res` in RiriLang map to the C++ references.
    -   Properties: `req.body`, `req.path`, `req.params`.
    -   Methods: `res.send(text)`, `res.json(obj)`.

### Phase 4: Middleware
1.  **`use(callback)`**:
    -   Map to `svr.set_pre_routing_handler(...)`.
    -   Callback signature: `(req, res, next)`.
    -   `next()` implementation: `httplib` handlers return `httplib::Server::HandlerResponse`.
    -   If middleware returns, we need to know if it handled the request or passed it.
    -   MVP: `use` simply runs before routing. `httplib` pre-routing handler returns `HandlerResponse::Handled` or `Unhandled`.

### Phase 5: Testing
1.  Create `examples/api_hello.rr`.
2.  Build and run.
3.  Verify with `curl`.

## Risks & Mitigations
-   **Blocking Operations**: `httplib` is blocking/threaded. RiriLang is single-threaded logic mostly? No, C++ threads.
-   **Memory Safety**: `req` reference validity. `httplib` passes const ref. We must not let it escape the callback.
-   **Type Safety**: `req.params` access. `httplib` uses `std::map`. RiriLang `req.params["id"]` logic needs to support map lookup.

## Verification Plan
-   **Automated**: Create a test script that starts the server (background) and curls it, checking output.
