from __future__ import annotations
import argparse, csv, io, json, os, re, shutil, signal, socket, subprocess, sys, threading, time, urllib.request, webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APPS = ROOT / 'apps'
LOGS = ROOT / 'logs'
LOGS.mkdir(exist_ok=True)
DASHBOARD_PATH = ROOT / 'launcher' / 'dashboard.html'

NPM = 'npm.cmd' if os.name == 'nt' else 'npm'
CMD_EXE = os.environ.get('COMSPEC', r'C:\\Windows\\System32\\cmd.exe') if os.name == 'nt' else None

EXPECTED_PORTS = [5050, 5173, 3001, 5174, 8000]

def _windows_listeners():
    """Return {port: {pid,...}} for TCP LISTENING sockets on Windows."""
    try:
        cp = subprocess.run(['netstat','-ano','-p','tcp'], capture_output=True, text=True, errors='ignore', check=False)
    except Exception:
        return {}
    found = {}
    for line in cp.stdout.splitlines():
        if 'LISTENING' not in line.upper():
            continue
        parts = line.split()
        if len(parts) < 5 or parts[0].upper() != 'TCP':
            continue
        local = parts[1]
        pid_text = parts[-1]
        m = re.search(r':(\d+)$', local)
        if not m or not pid_text.isdigit():
            continue
        port = int(m.group(1)); pid = int(pid_text)
        found.setdefault(port,set()).add(pid)
    return found

def _windows_image_name(pid):
    cp = subprocess.run(['tasklist','/FI',f'PID eq {pid}','/FO','CSV','/NH'], capture_output=True, text=True, errors='ignore', check=False)
    line = cp.stdout.strip()
    if not line or line.startswith('INFO:'):
        return ''
    try:
        return next(csv.reader(io.StringIO(line)))[0].strip().lower()
    except Exception:
        return ''

def stop_old_suite_servers():
    """Free this suite's fixed local ports before starting the new copy.

    This fixes a subtle Windows issue where an older extracted copy can remain
    alive on localhost and the browser then shows its stale CSS/UI.
    """
    if os.name != 'nt':
        return
    listeners = _windows_listeners()
    victims = set()
    blocked = []
    for port in EXPECTED_PORTS:
        for pid in listeners.get(port,set()):
            if pid == os.getpid():
                continue
            image = _windows_image_name(pid)
            if image.startswith('python') or image == 'node.exe' or image == 'py.exe':
                victims.add((pid,image,port))
            else:
                blocked.append((port,pid,image or 'unknown process'))
    if blocked:
        details = ', '.join(f'port {port} -> PID {pid} ({image})' for port,pid,image in blocked)
        raise RuntimeError('A required Raed Finance Suite port is already in use by another program: '+details+'. Close that program and run Start Raed Finance.bat again.')
    if victims:
        print('\nStopping old Raed Finance Suite local servers...')
        killed=set()
        for pid,image,port in sorted(victims):
            if pid in killed:
                continue
            print(f'  stopping PID {pid} ({image}) using port {port}')
            subprocess.run(['taskkill','/PID',str(pid),'/T','/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
            killed.add(pid)
        time.sleep(1.2)

def _port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(.25)
        return sock.connect_ex(('127.0.0.1',port)) == 0

def assert_ports_free():
    busy=[p for p in EXPECTED_PORTS if _port_open(p)]
    if busy:
        raise RuntimeError('Could not free required local port(s): '+', '.join(map(str,busy))+'. Close old terminal/server windows and try again.')


def npm_cmd(*args):
    # .cmd files cannot be launched directly by CreateProcess on Windows.
    # Always execute npm through cmd.exe there.
    if os.name == 'nt':
        return [CMD_EXE, '/d', '/s', '/c', NPM, *args]
    return [NPM, *args]

SERVICES = [
    {'name':'Investment Calculator','cwd':APPS/'investment-calculator','cmd':npm_cmd('run','dev','--','--host','127.0.0.1','--port','5173'),'url':'http://127.0.0.1:5173','health':'http://127.0.0.1:5173'},
    {'name':'Stock API','cwd':APPS/'stock-comparison-tool','cmd':npm_cmd('run','server'),'url':'http://127.0.0.1:3001','health':'http://127.0.0.1:3001/api/health'},
    {'name':'Stock Comparison','cwd':APPS/'stock-comparison-tool','cmd':npm_cmd('run','dev','--','--host','127.0.0.1','--port','5174'),'url':'http://127.0.0.1:5174','health':'http://127.0.0.1:5174'},
    {'name':'ETF Analysis','cwd':APPS/'etf-analysis','cmd':[sys.executable,'run.py'],'url':'http://127.0.0.1:8000','health':'http://127.0.0.1:8000/api/health'},
]

processes=[]
log_handles=[]

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/status':
            body=json.dumps({'services':[{'name':s['name'],'url':s['url']} for s in SERVICES]}).encode()
            self.send_response(200); self.send_header('Content-Type','application/json'); self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body); return
        body=DASHBOARD_PATH.read_text(encoding='utf-8').encode('utf-8')
        self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self.send_header('Cache-Control','no-store, no-cache, must-revalidate, max-age=0'); self.send_header('Pragma','no-cache'); self.send_header('Expires','0'); self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body)
    def log_message(self, *args): pass

def run(cmd,cwd,check=True):
    print('>', ' '.join(map(str,cmd)))
    return subprocess.run(cmd,cwd=cwd,check=check)

def install_dependencies():
    if not shutil.which(NPM):
        raise RuntimeError('Node.js/npm is required but npm was not found in PATH.')
    print('\n[1/3] Installing Investment Calculator dependencies...')
    run(npm_cmd('ci','--no-audit','--no-fund'), APPS/'investment-calculator')
    print('\n[2/3] Installing Stock Comparison dependencies...')
    run(npm_cmd('ci','--no-audit','--no-fund'), APPS/'stock-comparison-tool')
    print('\n[3/3] Installing ETF Analysis Python dependencies...')
    run([sys.executable,'-m','pip','install','-r','backend/requirements.txt'], APPS/'etf-analysis')

def wait_for(url, timeout=35):
    end=time.time()+timeout
    while time.time()<end:
        try:
            with urllib.request.urlopen(url,timeout=2) as r:
                if r.status < 500: return True
        except Exception: time.sleep(.6)
    return False

def start_service(service):
    log_path=LOGS/(service['name'].lower().replace(' ','_')+'.log')
    f=open(log_path,'a',encoding='utf-8')
    log_handles.append(f)
    flags=0
    if os.name=='nt': flags=subprocess.CREATE_NEW_PROCESS_GROUP
    p=subprocess.Popen(service['cmd'],cwd=service['cwd'],stdout=f,stderr=subprocess.STDOUT,creationflags=flags)
    processes.append(p)
    return p

def cleanup(*_):
    print('\nStopping services...')
    for p in reversed(processes):
        if p.poll() is None:
            try:
                if os.name=='nt': p.send_signal(signal.CTRL_BREAK_EVENT)
                else: p.terminate()
            except Exception: pass
    time.sleep(.8)
    for p in reversed(processes):
        if p.poll() is None:
            try: p.kill()
            except Exception: pass
    for f in log_handles:
        try: f.close()
        except Exception: pass
    raise SystemExit(0)

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--install',action='store_true'); args=parser.parse_args()
    if args.install: install_dependencies()
    signal.signal(signal.SIGINT,cleanup)
    if hasattr(signal,'SIGTERM'): signal.signal(signal.SIGTERM,cleanup)
    stop_old_suite_servers()
    assert_ports_free()
    print('\nStarting Raed Finance Suite (BLUE UI v3)...')
    for service in SERVICES:
        start_service(service)
        print(f"Started: {service['name']}")
    httpd=ThreadingHTTPServer(('127.0.0.1',5050),Handler)
    threading.Thread(target=httpd.serve_forever,daemon=True).start()
    print('\nChecking services:')
    all_ok=True
    for service in SERVICES:
        ok=wait_for(service['health'])
        all_ok &= ok
        print(f"  {'OK' if ok else 'FAILED'}  {service['name']} -> {service['url']}")
    dash_url='http://127.0.0.1:5050/?ui=blue-v3'
    print('\nDashboard:', dash_url)
    webbrowser.open(dash_url)
    if not all_ok: print(f"\nOne or more services did not answer. Check logs in: {LOGS}")
    print('Press Ctrl+C in this window to stop all services.')
    try:
        while True:
            dead=[(s,p) for s,p in zip(SERVICES,processes) if p.poll() is not None]
            if dead:
                for s,p in dead: print(f"WARNING: {s['name']} exited with code {p.returncode}. Check logs.")
                break
            time.sleep(2)
    except KeyboardInterrupt: cleanup()
    cleanup()

if __name__=='__main__': main()
