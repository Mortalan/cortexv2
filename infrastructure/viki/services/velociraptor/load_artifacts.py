import os
import subprocess

directory = '/opt/cortex/infrastructure/viki/services/velociraptor/artifacts/'
for filename in os.listdir(directory):
    if filename.endswith('.yaml'):
        path = os.path.join(directory, filename)
        with open(path, 'r') as f:
            content = f.read().replace("'", "''") # Escape single quotes for VQL
            # Remove leading --- if present
            if content.startswith('---'):
                content = content[3:].strip()
            
            query = f"SELECT artifact_set(definition='{content}') FROM scope()"
            cmd = ['docker', 'exec', 'velociraptor', './velociraptor', '--config', '/velociraptor/server.config.yaml', 'query', query]
            print(f"Loading {filename}...")
            subprocess.run(cmd)
