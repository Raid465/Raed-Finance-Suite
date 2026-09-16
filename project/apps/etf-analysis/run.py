import uvicorn

if __name__ == "__main__":
    # Reload mode adds a second watcher process and slows a local packaged app.
    # Keep a single stable server process for faster startup and fewer surprises.
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=False, access_log=False)
