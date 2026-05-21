import json
import struct

def inspect_glb_bones(file_path):
    with open(file_path, 'rb') as f:
        magic = f.read(4)
        if magic != b'glTF': return
        version = struct.unpack('<I', f.read(4))[0]
        length = struct.unpack('<I', f.read(4))[0]
        
        chunk_length = struct.unpack('<I', f.read(4))[0]
        chunk_type = f.read(4)
        if chunk_type != b'JSON': return
        
        json_data = f.read(chunk_length).decode('utf-8', errors='ignore')
        gltf = json.loads(json_data)
        
        # Get nodes and find bones
        nodes = gltf.get('nodes', [])
        print(f"Total nodes: {len(nodes)}")
        bone_names = []
        for idx, node in enumerate(nodes):
            name = node.get('name', '')
            # Bones often have specific suffixes or names
            if any(k in name.lower() for k in ['head', 'neck', 'spine', 'shoulder', 'chest', 'arm', 'hand']):
                bone_names.append(name)
        
        print("Matching bones/nodes found:")
        for name in sorted(list(set(bone_names)))[:50]:
            print(f"  - {name}")

if __name__ == '__main__':
    inspect_glb_bones('/home/louis/cortex/infrastructure/viki/services/dashboard-react/public/assets/viki_android_real.glb')
