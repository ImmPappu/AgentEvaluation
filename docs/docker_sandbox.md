# Docker Sandbox Architecture & Security Model

**Version:** 1.0  
**Status:** Stable / Active  
**Author:** Mohit (Backend Orchestrator)

---

## 1. Purpose

The **Docker Sandbox** (`sandbox/Dockerfile.sandbox`) provides an isolated container runtime for evaluating AI agents in AgentGuard. It prevents untrusted or flawed agents from making unauthorized host filesystem modifications, executing arbitrary system calls, or establishing external network connections.

---

## 2. Architecture & Isolation Layers

```
+-------------------------------------------------------------+
|                      Host Machine                           |
|                                                             |
|   +-----------------------------------------------------+   |
|   |         Docker Container (agent-eval-sandbox)       |   |
|   |                                                     |   |
|   |   User: agent (uid=1000, non-root)                  |   |
|   |   Network: NONE (--network none)                    |   |
|   |   Capabilities: Dropped / Minimal                   |   |
|   |   Working Dir: /app                                 |   |
|   |                                                     |   |
|   |   +---------------------------------------------+   |   |
|   |   | sandbox/runner.py                           |   |   |
|   |   |   --> Mock Tools (In-Memory Database)       |   |   |
|   |   |   --> Trace JSON Serialization              |   |   |
|   |   +---------------------------------------------+   |   |
|   +-----------------------------------------------------+   |
|                              |                              |
|                              v (Output Trace Mount)         |
|                     ./traces/run_001.json                   |
+-------------------------------------------------------------+
```

---

## 3. Build & Run Specifications

### 3.1 Build Command

Run from the root of the repository:

```bash
docker build \
  -t agent-eval-sandbox \
  -f sandbox/Dockerfile.sandbox \
  .
```

### 3.2 Execution Command (Network Isolated & Bind Mounted Output)

```bash
docker run --rm \
  --network none \
  -v "$(pwd)/traces:/app/traces" \
  agent-eval-sandbox \
  --scenario scenarios/01_get_order_success.json \
  --out traces/docker_run_001.json
```

---

## 4. Isolation Guarantees

### 4.1 Non-Root User Execution
The container runs under a dedicated, unprivileged user named `agent` (`uid=1000`, `gid=1000`).

Verify with:
```bash
docker run --rm agent-eval-sandbox whoami
# Output: agent
```

### 4.2 Network Isolation (`--network none`)
All networking is disabled at container launch using `--network none`. Since AgentGuard uses in-memory mock tools (`sandbox/mock_tools/`), scenario execution operates without external HTTP/API connections.

Verify with:
```bash
docker run --rm --network none agent-eval-sandbox python -c "import socket; socket.create_connection(('8.8.8.8', 53))"
# Output: Network is unreachable
```

### 4.3 Filesystem Isolation & Trace Retrieval
* The host filesystem is protected. The container workspace is limited to `/app`.
* Traces generated inside `/app/traces/` can be retrieved cleanly via:
  - **Narrowly scoped bind mount**: `-v "$(pwd)/traces:/app/traces"`
  - **Docker Copy**: `docker cp <container_id>:/app/traces/docker_run_001.json ./traces/`

---

## 5. Deterministic Execution

Environment variables can be overridden at runtime to control seed and agent version deterministically:

```bash
docker run --rm \
  --network none \
  -e AGENT_SEED=12345 \
  -e AGENT_VERSION=v1.2.0 \
  agent-eval-sandbox \
  --scenario scenarios/01_get_order_success.json \
  --seed 12345
```

Running the exact scenario with the same seed produces identical trace output structure matching `docs/trace_schema.md`.

---

## 6. Security Limitations & Best Practices

* **Isolation Layer**: Docker containers provide process and namespace isolation; they do not replace a full VM boundary (e.g. gVisor / Firecracker) for untrusted C/C++ binaries.
* **No Docker Socket**: The Docker socket (`/var/run/docker.sock`) is NEVER mounted inside the sandbox container.
* **No Privileged Mode**: `--privileged` flag is strictly forbidden.
* **No External Secrets**: No API keys or credentials exist inside the image or environment.

---

## 7. CI Pipeline Integration (GitHub Actions)

In GitHub Actions workflows (`.github/workflows/ci.yml`), build and run the sandbox container as follows:

```yaml
- name: Build Sandbox Image
  run: docker build -t agent-eval-sandbox -f sandbox/Dockerfile.sandbox .

- name: Execute Sandbox Scenario
  run: |
    docker run --rm \
      --network none \
      -v ${{ github.workspace }}/traces:/app/traces \
      agent-eval-sandbox \
      --scenario scenarios/01_get_order_success.json \
      --out traces/ci_trace.json
```
