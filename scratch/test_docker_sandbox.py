import os
import sys
import shutil
import json
import subprocess
from scratch.validate_schemas import validate_trace

IMAGE_NAME = "agent-eval-sandbox"
DOCKERFILE_PATH = "sandbox/Dockerfile.sandbox"

def is_docker_available() -> bool:
    """Checks if docker executable exists on PATH and daemon is responsive."""
    if shutil.which("docker") is None:
        return False
    try:
        res = subprocess.run(["docker", "info"], capture_output=True, text=True, timeout=5)
        return res.returncode == 0
    except Exception:
        return False

def validate_dockerfile_contents():
    """Validates key security directives inside Dockerfile.sandbox statically."""
    print("--> Validating Dockerfile.sandbox directives...")
    assert os.path.exists(DOCKERFILE_PATH), f"Dockerfile missing at {DOCKERFILE_PATH}"
    with open(DOCKERFILE_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    assert "FROM python:" in content, "Dockerfile must use official Python base image."
    assert "useradd" in content and "agent" in content, "Dockerfile must create dedicated 'agent' user."
    assert "USER agent" in content, "Dockerfile must switch to non-root USER agent."
    assert "ENTRYPOINT" in content, "Dockerfile must specify ENTRYPOINT."
    print("SUCCESS: Static Dockerfile.sandbox validation passed!")

def run_docker_smoke_tests():
    print("=== AgentGuard Docker Sandbox Smoke Test ===")
    validate_dockerfile_contents()

    docker_ok = is_docker_available()
    if not docker_ok:
        print("\n[DIAGNOSTIC NOTICE] 'docker' CLI or Docker daemon is not active on this host environment.")
        print("  - Dockerfile.sandbox definition created successfully.")
        print("  - Static Dockerfile security rules verified.")
        print("  - Live container execution tests skipped due to missing host Docker daemon.")
        return

    print("\n1. Building Docker Sandbox Image...")
    build_cmd = ["docker", "build", "-t", IMAGE_NAME, "-f", DOCKERFILE_PATH, "."]
    res = subprocess.run(build_cmd, capture_output=True, text=True)
    assert res.returncode == 0, f"Docker build failed: {res.stderr}"
    print("SUCCESS: Image built successfully!")

    print("\n2. Testing Non-Root User Execution (whoami)...")
    whoami_cmd = ["docker", "run", "--rm", IMAGE_NAME, "whoami"]
    res = subprocess.run(whoami_cmd, capture_output=True, text=True)
    user_out = res.stdout.strip()
    print(f"   whoami output: {user_out}")
    assert user_out == "agent", f"Expected non-root user 'agent', got '{user_out}'"
    assert user_out != "root", "SECURITY FAILURE: Container executed as root!"
    print("SUCCESS: Non-root user verified!")

    print("\n3. Testing Network Isolation (--network none)...")
    net_cmd = [
        "docker", "run", "--rm", "--network", "none", IMAGE_NAME,
        "python", "-c", "import urllib.request; urllib.request.urlopen('http://8.8.8.8', timeout=2)"
    ]
    res = subprocess.run(net_cmd, capture_output=True, text=True)
    assert res.returncode != 0, "SECURITY FAILURE: Container had outbound network access!"
    print("SUCCESS: Network isolation verified (--network none correctly blocks external connections)!")

    print("\n4. Running Scenario Runner in Container...")
    os.makedirs("traces", exist_ok=True)
    trace_file = "traces/docker_test_trace.json"
    run_cmd = [
        "docker", "run", "--rm", "--network", "none",
        "-v", f"{os.getcwd()}/traces:/app/traces",
        IMAGE_NAME,
        "--scenario", "scenarios/01_get_order_success.json",
        "--out", trace_file
    ]
    res = subprocess.run(run_cmd, capture_output=True, text=True)
    assert res.returncode == 0, f"Scenario execution failed: {res.stderr}"
    print("SUCCESS: Container scenario execution finished cleanly!")

    print("\n5. Validating Output Trace JSON...")
    assert os.path.exists(trace_file), "Trace output file not generated."
    with open(trace_file, "r", encoding="utf-8") as f:
        trace_data = json.load(f)
    
    schema_errors = validate_trace(trace_data)
    assert len(schema_errors) == 0, f"Schema validation errors: {schema_errors}"
    print("SUCCESS: Generated trace is 100% compliant with trace_schema.md!")

    print("\n=== ALL DOCKER SMOKE TESTS PASSED CLEANLY! ===")

if __name__ == "__main__":
    run_docker_smoke_tests()
